package com.tap.service;

import com.tap.dto.*;
import com.tap.exception.ApiException;
import com.tap.model.*;
import com.tap.repository.CardRepository;
import com.tap.repository.ItemRepository;
import com.tap.repository.TransactionRepository;
import com.tap.repository.UserRepository;
import com.tap.repository.WalletRepository;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    // Card data validation (see AddCardRequest): Card Number is always exactly
    // 12 digits. Card UID is the physical card's real NFC identifier - a
    // 14-character HEXADECIMAL string (0-9 and A-F), e.g. "04A1B2C3D4E5F6",
    // not a plain decimal number. Enforced here too so the bulk CSV/Excel
    // importer (which doesn't go through AddCardRequest's bean validation)
    // can't slip malformed rows past the single-add form's rules. Stored
    // (and matched against, in PaymentService) as uppercase so a UID read
    // from a real reader in lowercase still matches one entered/generated
    // in uppercase.
    private static final java.util.regex.Pattern CARD_NO_PATTERN = java.util.regex.Pattern.compile("^[0-9]{12}$");
    private static final java.util.regex.Pattern CARD_UID_PATTERN = java.util.regex.Pattern.compile("^[0-9A-F]{14}$");
    // Same phone rule as RegisterCustomerToCardRequest: exactly 10 digits, no spaces/dashes/country code.
    private static final java.util.regex.Pattern PHONE_PATTERN = java.util.regex.Pattern.compile("^[0-9]{10}$");

    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final ItemRepository itemRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public AdminService(UserRepository userRepository, CardRepository cardRepository,
                        WalletRepository walletRepository, TransactionRepository transactionRepository,
                        ItemRepository itemRepository, PasswordEncoder passwordEncoder,
                        MailService mailService) {
        this.userRepository = userRepository;
        this.cardRepository = cardRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.itemRepository = itemRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    // ---- Card provisioning (admin panel: "Add cards" - CSV or single) ----

    /**
     * Manually add one unassigned card: admin enters the cardNo and the
     * cardUid scanned off the physical card. Both are required - the UID
     * is never auto-generated, since a UID that doesn't match the real
     * physical card would mean that card could never actually authenticate.
     * The card starts unregistered - no customer is linked to it yet.
     */
    @Transactional
    public Card addCard(AddCardRequest req) {
        String cardNo = req.getCardNo().trim();
        if (!CARD_NO_PATTERN.matcher(cardNo).matches()) {
            throw new ApiException("Card Number must contain exactly 12 digits", HttpStatus.BAD_REQUEST);
        }
        if (cardRepository.existsByCardNo(cardNo)) {
            throw new ApiException("A card with this Card No already exists", HttpStatus.CONFLICT);
        }

        String cardUid = req.getCardUid() == null ? "" : req.getCardUid().trim().toUpperCase(Locale.ROOT);
        if (cardUid.isBlank()) {
            throw new ApiException("Card UID is required", HttpStatus.BAD_REQUEST);
        }
        if (!CARD_UID_PATTERN.matcher(cardUid).matches()) {
            throw new ApiException("Card UID must be exactly 14 hexadecimal characters (0-9, A-F)", HttpStatus.BAD_REQUEST);
        }
        if (cardRepository.existsByCardUid(cardUid)) {
            throw new ApiException("A card with this UID already exists", HttpStatus.CONFLICT);
        }

        Card card = new Card();
        card.setCardNo(cardNo);
        card.setCardUid(cardUid);
        card.setUser(null);
        card.setRegistered(false);
        card.setEnabled(true);
        return cardRepository.save(card);
    }

    /**
     * Bulk-add entry point used by the admin panel's single upload form -
     * accepts either a CSV or an Excel (.xlsx / .xls) file and dispatches to
     * the right parser based on the uploaded filename's extension.
     */
    @Transactional
    public CsvCardUploadResult uploadCards(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("File is empty", HttpStatus.BAD_REQUEST);
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return uploadCardsExcel(file);
        }
        return uploadCardsCsv(file);
    }

    /**
     * Bulk version of addCard: uploads a CSV with a header row containing
     * "CardNo" and "cardUid" columns - both required, one row per physical
     * card. Each row is processed independently - a bad row is recorded as
     * an error but doesn't stop the rest of the batch.
     */
    @Transactional
    public CsvCardUploadResult uploadCardsCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("CSV file is empty", HttpStatus.BAD_REQUEST);
        }

        List<String> errors = new ArrayList<>();
        int totalRows = 0;
        int created = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new ApiException("CSV file has no header row", HttpStatus.BAD_REQUEST);
            }
            List<String> headers = splitCsvLine(headerLine).stream()
                    .map(h -> h.trim().toLowerCase())
                    .collect(Collectors.toList());
            int cardNoCol = headers.indexOf("cardno");
            int cardUidCol = headers.indexOf("carduid");
            if (cardNoCol == -1 || cardUidCol == -1) {
                throw new ApiException("CSV must have \"CardNo\" and \"cardUid\" columns", HttpStatus.BAD_REQUEST);
            }

            String line;
            int rowNum = 1;
            while ((line = reader.readLine()) != null) {
                rowNum++;
                if (line.isBlank()) continue;
                totalRows++;

                List<String> cols = splitCsvLine(line);
                String cardNo = cellOrBlank(cols, cardNoCol);
                String cardUid = cellOrBlank(cols, cardUidCol);

                String rowError = createCardFromRow(cardNo, cardUid);
                if (rowError != null) {
                    errors.add("Row " + rowNum + ": " + rowError);
                } else {
                    created++;
                }
            }
        } catch (IOException e) {
            log.error("Failed to read uploaded CSV: {}", e.toString(), e);
            throw new ApiException("Could not read the uploaded file", HttpStatus.BAD_REQUEST);
        }

        return new CsvCardUploadResult(totalRows, created, totalRows - created, errors);
    }

    /**
     * Bulk-add cards from an Excel workbook (.xlsx or legacy .xls). Same
     * "CardNo" / "cardUid" header convention as the CSV importer - both
     * required - read from the first sheet.
     */
    @Transactional
    public CsvCardUploadResult uploadCardsExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Excel file is empty", HttpStatus.BAD_REQUEST);
        }

        List<String> errors = new ArrayList<>();
        int totalRows = 0;
        int created = 0;
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new ApiException("Excel file has no rows", HttpStatus.BAD_REQUEST);
            }

            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                throw new ApiException("Excel file has no header row", HttpStatus.BAD_REQUEST);
            }

            int cardNoCol = -1;
            int cardUidCol = -1;
            for (Cell cell : headerRow) {
                String header = formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT);
                if (header.equals("cardno")) cardNoCol = cell.getColumnIndex();
                if (header.equals("carduid")) cardUidCol = cell.getColumnIndex();
            }
            if (cardNoCol == -1 || cardUidCol == -1) {
                throw new ApiException("Excel file must have \"CardNo\" and \"cardUid\" columns", HttpStatus.BAD_REQUEST);
            }

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String cardNo = readCell(row, cardNoCol, formatter);
                String cardUid = readCell(row, cardUidCol, formatter);
                if (cardNo.isBlank() && cardUid.isBlank()) continue; // skip fully blank rows

                totalRows++;
                String rowError = createCardFromRow(cardNo, cardUid);
                if (rowError != null) {
                    errors.add("Row " + (r + 1) + ": " + rowError);
                } else {
                    created++;
                }
            }
        } catch (IOException e) {
            log.error("Failed to read uploaded Excel file: {}", e.toString(), e);
            throw new ApiException("Could not read the uploaded file - make sure it's a valid .xlsx/.xls", HttpStatus.BAD_REQUEST);
        }

        return new CsvCardUploadResult(totalRows, created, totalRows - created, errors);
    }

    private String readCell(Row row, int col, DataFormatter formatter) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        if (cell.getCellType() == CellType.NUMERIC) {
            // Avoid "4521.0" for card numbers typed as numbers in the spreadsheet
            double value = cell.getNumericCellValue();
            if (value == Math.floor(value)) {
                return String.valueOf((long) value);
            }
        }
        return formatter.formatCellValue(cell).trim();
    }

    /**
     * Shared row-creation logic used by both the CSV and Excel importers.
     * Returns null on success, or a human-readable error message to record
     * against that row. Both cardNo and cardUid are required - the UID is
     * never auto-generated, it must be the real value read off the
     * physical card.
     */
    private String createCardFromRow(String cardNo, String cardUid) {
        cardNo = cardNo == null ? "" : cardNo.trim();
        cardUid = cardUid == null ? "" : cardUid.trim().toUpperCase(Locale.ROOT);

        if (cardNo.isBlank()) {
            return "missing CardNo, skipped";
        }
        if (!CARD_NO_PATTERN.matcher(cardNo).matches()) {
            return "CardNo " + cardNo + " must be exactly 12 digits, skipped";
        }
        if (cardRepository.existsByCardNo(cardNo)) {
            return "CardNo " + cardNo + " already exists, skipped";
        }
        if (cardUid.isBlank()) {
            return "missing cardUid, skipped";
        }
        if (!CARD_UID_PATTERN.matcher(cardUid).matches()) {
            return "cardUid " + cardUid + " must be exactly 14 hexadecimal characters (0-9, A-F), skipped";
        }
        if (cardRepository.existsByCardUid(cardUid)) {
            return "cardUid " + cardUid + " already exists, skipped";
        }

        Card card = new Card();
        card.setCardNo(cardNo);
        card.setCardUid(cardUid);
        card.setUser(null);
        card.setRegistered(false);
        card.setEnabled(true);
        cardRepository.save(card);
        return null;
    }

    // ---- "Register customer" button: find card by CardNo, then register a customer to it ----

    public CardLookupResponse findCardByCardNo(String cardNo) {
        Card card = cardRepository.findByCardNo(cardNo.trim())
                .orElseThrow(() -> new ApiException("Card not found", HttpStatus.NOT_FOUND));
        return new CardLookupResponse(card);
    }

    @Transactional
    public User registerCustomerToCard(String cardNo, RegisterCustomerToCardRequest req) {
        Card card = cardRepository.findByCardNo(cardNo.trim())
                .orElseThrow(() -> new ApiException("Card not found", HttpStatus.NOT_FOUND));

        if (card.isRegistered() || card.getUser() != null) {
            throw new ApiException("This card is already registered to a customer", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new ApiException("Username already taken", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ApiException("Email already registered", HttpStatus.CONFLICT);
        }

        User user = new User();
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        user.setUsername(req.getUsername());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole(Role.USER);
        user.setApprovalStatus(ApprovalStatus.APPROVED);
        user.setEnabled(true);
        user.setApprovedAt(LocalDateTime.now());
        // Admin set this password directly - still force a change on first
        // login as a security best practice.
        user.setMustChangePassword(true);
        User savedUser = userRepository.save(user);

        Wallet wallet = new Wallet();
        wallet.setOwner(savedUser);
        wallet.setLabel(Wallet.WalletLabel.WALLET1);
        walletRepository.save(wallet);

        card.setUser(savedUser);
        card.setRegistered(true);
        card.setEnabled(true);
        cardRepository.save(card);

        mailService.notifyCustomerCardRegistered(savedUser.getEmail(), savedUser.getFullName(),
                savedUser.getUsername(), card.getCardNo(), req.getPassword());

        return savedUser;
    }

    // ---- Bulk customer + card registration ----
    // Lets an institution hand the admin a single CSV/Excel of their
    // customers (one row per person, referencing a CardNo already loaded
    // into the system via the card importer above) instead of the admin
    // registering each one by hand through the "Register Customer" form.
    // Mirrors registerCustomerToCard()'s rules exactly, row by row - a bad
    // row is recorded as an error but never stops the rest of the batch.

    /**
     * Dispatches to the CSV or Excel bulk-customer parser based on the
     * uploaded filename's extension, same convention as uploadCards().
     */
    @Transactional
    public CustomerCardUploadResult uploadCustomerCards(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("File is empty", HttpStatus.BAD_REQUEST);
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return uploadCustomerCardsExcel(file);
        }
        return uploadCustomerCardsCsv(file);
    }

    /**
     * Bulk customer+card registration from a CSV. All six columns are
     * required: "CardNo", "FullName", "Email", "Phone", "Username" and
     * "Password" - nothing here is auto-generated, since the password in
     * particular has to be something the institution/admin actually knows
     * and can hand to the customer if the welcome email doesn't land.
     */
    @Transactional
    public CustomerCardUploadResult uploadCustomerCardsCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("CSV file is empty", HttpStatus.BAD_REQUEST);
        }

        List<String> errors = new ArrayList<>();
        List<BulkCustomerRow> createdCustomers = new ArrayList<>();
        int totalRows = 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new ApiException("CSV file has no header row", HttpStatus.BAD_REQUEST);
            }
            List<String> headers = splitCsvLine(headerLine).stream()
                    .map(h -> h.trim().toLowerCase())
                    .collect(Collectors.toList());
            int cardNoCol = headers.indexOf("cardno");
            int fullNameCol = headers.indexOf("fullname");
            int emailCol = headers.indexOf("email");
            int phoneCol = headers.indexOf("phone");
            int usernameCol = headers.indexOf("username");
            int passwordCol = headers.indexOf("password");
            if (cardNoCol == -1 || fullNameCol == -1 || emailCol == -1
                    || phoneCol == -1 || usernameCol == -1 || passwordCol == -1) {
                throw new ApiException(
                        "CSV must have \"CardNo\", \"FullName\", \"Email\", \"Phone\", \"Username\" and \"Password\" columns",
                        HttpStatus.BAD_REQUEST);
            }

            String line;
            int rowNum = 1;
            while ((line = reader.readLine()) != null) {
                rowNum++;
                if (line.isBlank()) continue;
                totalRows++;

                List<String> cols = splitCsvLine(line);
                String cardNo = cellOrBlank(cols, cardNoCol);
                String fullName = cellOrBlank(cols, fullNameCol);
                String email = cellOrBlank(cols, emailCol);
                String phone = cellOrBlank(cols, phoneCol);
                String username = cellOrBlank(cols, usernameCol);
                String password = cellOrBlank(cols, passwordCol);

                try {
                    BulkCustomerRow created = registerCustomerRowFromBulk(cardNo, fullName, email, phone, username, password);
                    createdCustomers.add(created);
                } catch (ApiException e) {
                    errors.add("Row " + rowNum + ": " + e.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Failed to read uploaded customer CSV: {}", e.toString(), e);
            throw new ApiException("Could not read the uploaded file", HttpStatus.BAD_REQUEST);
        }

        return new CustomerCardUploadResult(totalRows, createdCustomers.size(), totalRows - createdCustomers.size(), errors, createdCustomers);
    }

    private String cellOrBlank(List<String> cols, int idx) {
        return idx != -1 && idx < cols.size() ? cols.get(idx).trim() : "";
    }

    /**
     * Same bulk customer+card registration as the CSV importer, reading
     * from an Excel workbook (.xlsx or legacy .xls) instead. Same header
     * convention: "CardNo", "FullName", "Email", "Phone", "Username" and
     * "Password" all required.
     */
    @Transactional
    public CustomerCardUploadResult uploadCustomerCardsExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Excel file is empty", HttpStatus.BAD_REQUEST);
        }

        List<String> errors = new ArrayList<>();
        List<BulkCustomerRow> createdCustomers = new ArrayList<>();
        int totalRows = 0;
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new ApiException("Excel file has no rows", HttpStatus.BAD_REQUEST);
            }

            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                throw new ApiException("Excel file has no header row", HttpStatus.BAD_REQUEST);
            }

            int cardNoCol = -1, fullNameCol = -1, emailCol = -1, phoneCol = -1, usernameCol = -1, passwordCol = -1;
            for (Cell cell : headerRow) {
                String header = formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT);
                switch (header) {
                    case "cardno": cardNoCol = cell.getColumnIndex(); break;
                    case "fullname": fullNameCol = cell.getColumnIndex(); break;
                    case "email": emailCol = cell.getColumnIndex(); break;
                    case "phone": phoneCol = cell.getColumnIndex(); break;
                    case "username": usernameCol = cell.getColumnIndex(); break;
                    case "password": passwordCol = cell.getColumnIndex(); break;
                    default: break;
                }
            }
            if (cardNoCol == -1 || fullNameCol == -1 || emailCol == -1
                    || phoneCol == -1 || usernameCol == -1 || passwordCol == -1) {
                throw new ApiException(
                        "Excel file must have \"CardNo\", \"FullName\", \"Email\", \"Phone\", \"Username\" and \"Password\" columns",
                        HttpStatus.BAD_REQUEST);
            }

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String cardNo = readCell(row, cardNoCol, formatter);
                String fullName = readCell(row, fullNameCol, formatter);
                String email = readCell(row, emailCol, formatter);
                String phone = readCell(row, phoneCol, formatter);
                String username = readCell(row, usernameCol, formatter);
                String password = readCell(row, passwordCol, formatter);
                if (cardNo.isBlank() && fullName.isBlank() && email.isBlank()
                        && phone.isBlank() && username.isBlank() && password.isBlank()) {
                    continue; // skip fully blank rows
                }

                totalRows++;
                try {
                    BulkCustomerRow created = registerCustomerRowFromBulk(cardNo, fullName, email, phone, username, password);
                    createdCustomers.add(created);
                } catch (ApiException e) {
                    errors.add("Row " + (r + 1) + ": " + e.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Failed to read uploaded customer Excel file: {}", e.toString(), e);
            throw new ApiException("Could not read the uploaded file - make sure it's a valid .xlsx/.xls", HttpStatus.BAD_REQUEST);
        }

        return new CustomerCardUploadResult(totalRows, createdCustomers.size(), totalRows - createdCustomers.size(), errors, createdCustomers);
    }

    /**
     * Shared per-row logic for both the CSV and Excel bulk-customer
     * importers - validates everything up front (mirroring
     * registerCustomerToCard) so a failed row never leaves a half-created
     * user or wallet behind, then creates the account exactly the same way
     * the single "Register Customer" form does. All six fields are
     * required - nothing here is auto-generated, since the password in
     * particular needs to be something the institution/admin actually
     * knows. Throws ApiException with a human-readable message on any
     * problem; the caller records it against that row and moves on to the
     * next one.
     */
    @Transactional
    public BulkCustomerRow registerCustomerRowFromBulk(String cardNo, String fullName, String email,
                                                         String phone, String username, String password) {
        cardNo = cardNo == null ? "" : cardNo.trim();
        fullName = fullName == null ? "" : fullName.trim();
        email = email == null ? "" : email.trim();
        phone = phone == null ? "" : phone.trim();
        username = username == null ? "" : username.trim();
        password = password == null ? "" : password.trim();

        if (cardNo.isBlank()) {
            throw new ApiException("missing CardNo, skipped", HttpStatus.BAD_REQUEST);
        }
        if (fullName.isBlank()) {
            throw new ApiException("missing FullName, skipped", HttpStatus.BAD_REQUEST);
        }
        if (email.isBlank()) {
            throw new ApiException("missing Email, skipped", HttpStatus.BAD_REQUEST);
        }
        if (phone.isBlank()) {
            throw new ApiException("missing Phone, skipped", HttpStatus.BAD_REQUEST);
        }
        if (!PHONE_PATTERN.matcher(phone).matches()) {
            throw new ApiException("Phone must be exactly 10 digits, skipped", HttpStatus.BAD_REQUEST);
        }
        if (username.isBlank()) {
            throw new ApiException("missing Username, skipped", HttpStatus.BAD_REQUEST);
        }
        if (password.isBlank()) {
            throw new ApiException("missing Password, skipped", HttpStatus.BAD_REQUEST);
        }

        // cardNo was reassigned (trimmed) above, so it's no longer
        // effectively final and can't be captured by the lambda below.
        final String cardNoFinal = cardNo;
        Card card = cardRepository.findByCardNo(cardNo)
                .orElseThrow(() -> new ApiException("CardNo " + cardNoFinal + " not found, skipped", HttpStatus.NOT_FOUND));
        if (card.isRegistered() || card.getUser() != null) {
            throw new ApiException("CardNo " + cardNo + " is already registered to a customer, skipped", HttpStatus.CONFLICT);
        }
        if (!card.isEnabled()) {
            throw new ApiException("CardNo " + cardNo + " is disabled, enable it first, skipped", HttpStatus.BAD_REQUEST);
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException("Email " + email + " is already registered, skipped", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByUsername(username)) {
            throw new ApiException("Username " + username + " is already taken, skipped", HttpStatus.CONFLICT);
        }

        User user = new User();
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(Role.USER);
        user.setApprovalStatus(ApprovalStatus.APPROVED);
        user.setEnabled(true);
        user.setApprovedAt(LocalDateTime.now());
        user.setMustChangePassword(true);
        User savedUser = userRepository.save(user);

        Wallet wallet = new Wallet();
        wallet.setOwner(savedUser);
        wallet.setLabel(Wallet.WalletLabel.WALLET1);
        walletRepository.save(wallet);

        card.setUser(savedUser);
        card.setRegistered(true);
        card.setEnabled(true);
        card.setRegisteredAt(LocalDateTime.now());
        cardRepository.save(card);

        mailService.notifyCustomerCardRegistered(savedUser.getEmail(), savedUser.getFullName(),
                savedUser.getUsername(), card.getCardNo(), password);

        return new BulkCustomerRow(card.getCardNo(), savedUser.getFullName(), savedUser.getUsername());
    }

    // ---- Link an existing user account (by user ID) to a card ----

    /**
     * Step 1 of the "link by user ID" flow: look the account up so the admin
     * can confirm they've got the right person before linking a card to it.
     */
    public UserLookupResponse findUserById(Long userId) {
        User user = getUserOrThrow(userId);
        if (user.getRole() != Role.USER) {
            throw new ApiException("Only customer (USER) accounts can be linked to a card", HttpStatus.BAD_REQUEST);
        }
        boolean alreadyHasCard = !cardRepository.findByUser(user).isEmpty();
        return new UserLookupResponse(user, alreadyHasCard);
    }

    /**
     * Step 2: link an unregistered card directly to an existing customer
     * account by user ID, instead of creating a brand-new account. Useful
     * for replacing a lost card, or provisioning a card for someone who
     * already registered but doesn't have one yet.
     */
    @Transactional
    public User linkCardToExistingUser(String cardNo, LinkCardToUserRequest req) {
        Card card = cardRepository.findByCardNo(cardNo.trim())
                .orElseThrow(() -> new ApiException("Card not found", HttpStatus.NOT_FOUND));

        if (card.isRegistered() || card.getUser() != null) {
            throw new ApiException("This card is already registered to a customer", HttpStatus.CONFLICT);
        }
        if (!card.isEnabled()) {
            throw new ApiException("This card is disabled. Enable it first.", HttpStatus.BAD_REQUEST);
        }

        User user = getUserOrThrow(req.getUserId());
        if (user.getRole() != Role.USER) {
            throw new ApiException("Only customer (USER) accounts can be linked to a card", HttpStatus.BAD_REQUEST);
        }

        // Make sure the account has a WALLET1 to receive money into - it
        // should already exist from registration, but this is a safety net.
        walletRepository.findByOwner(user).orElseGet(() -> {
            Wallet wallet = new Wallet();
            wallet.setOwner(user);
            wallet.setLabel(Wallet.WalletLabel.WALLET1);
            return walletRepository.save(wallet);
        });

        card.setUser(user);
        card.setRegistered(true);
        card.setEnabled(true);
        card.setRegisteredAt(LocalDateTime.now());
        cardRepository.save(card);

        mailService.notifyCustomerCardRegistered(user.getEmail(), user.getFullName(), user.getUsername(), card.getCardNo());

        return user;
    }

    public List<CardAdminView> getAllCards() {
        return cardRepository.findAll().stream()
                .map(CardAdminView::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public void setCardEnabled(Long cardId, boolean enabled) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ApiException("Card not found", HttpStatus.NOT_FOUND));
        card.setEnabled(enabled);
        cardRepository.save(card);
    }

    // ---- Sub-admin management: strictly gated behind /api/admin/** (ADMIN role only,
    // see SecurityConfig) so only an existing admin can ever create another admin account. ----

    public List<AdminView> listAdmins() {
        return userRepository.findByRole(Role.ADMIN).stream()
                .map(AdminView::new)
                .collect(Collectors.toList());
    }

    @Transactional
    public User createSubAdmin(CreateAdminRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new ApiException("Username already taken", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ApiException("Email already registered", HttpStatus.CONFLICT);
        }

        User admin = new User();
        admin.setFullName(req.getFullName());
        admin.setEmail(req.getEmail());
        admin.setPhone(req.getPhone());
        admin.setUsername(req.getUsername());
        admin.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        admin.setRole(Role.ADMIN);
        admin.setApprovalStatus(ApprovalStatus.APPROVED);
        admin.setEnabled(true);
        admin.setApprovedAt(LocalDateTime.now());
        // Created directly by an existing admin - still force a password change on first login.
        admin.setMustChangePassword(true);
        return userRepository.save(admin);
    }

    // ---- All Registered Customers: full profile (account + card + wallet balance) ----

    public List<CustomerProfileView> getRegisteredCustomers() {
        return userRepository.findByRole(Role.USER).stream()
                .map(user -> {
                    Card card = cardRepository.findByUser(user).stream().findFirst().orElse(null);
                    BigDecimal balance = walletRepository.findByOwner(user)
                            .map(Wallet::getBalance)
                            .orElse(BigDecimal.ZERO);
                    return new CustomerProfileView(user, card, balance);
                })
                .collect(Collectors.toList());
    }

    // ---- Institution accounts: created directly by an admin - there is no
    // public self-registration path anymore. ----

    @Transactional
    public User createInstitution(CreateInstitutionRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new ApiException("Username already taken", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ApiException("Email already registered", HttpStatus.CONFLICT);
        }

        User institution = new User();
        institution.setFullName(req.getFullName());
        institution.setEmail(req.getEmail());
        institution.setPhone(req.getPhone());
        institution.setUsername(req.getUsername());
        institution.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        institution.setRole(Role.INSTITUTION);
        institution.setInstitutionName(req.getInstitutionName());
        institution.setApprovalStatus(ApprovalStatus.APPROVED);
        institution.setEnabled(true);
        institution.setApprovedAt(LocalDateTime.now());
        institution.setMustChangePassword(true);

        User saved = userRepository.save(institution);

        Wallet wallet = new Wallet();
        wallet.setOwner(saved);
        wallet.setLabel(Wallet.WalletLabel.WALLET2);
        walletRepository.save(wallet);

        mailService.notifyUserOfApproval(saved.getEmail(), true);

        return saved;
    }

    public List<InstitutionProfileView> getInstitutions() {
        return userRepository.findByRole(Role.INSTITUTION).stream()
                .map(user -> {
                    BigDecimal balance = walletRepository.findByOwner(user)
                            .map(Wallet::getBalance)
                            .orElse(BigDecimal.ZERO);
                    return new InstitutionProfileView(user, balance);
                })
                .collect(Collectors.toList());
    }

    // Minimal CSV splitter: handles plain comma-separated values and values
    // wrapped in double quotes (to allow commas inside a quoted field).
    private List<String> splitCsvLine(String line) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());
        return result;
    }

    // ---- Search existing users by username/name/email, with an optional role
    // filter - backs the admin "Update Existing User" picker so the admin no
    // longer has to already know a raw numeric user ID. ----

    public List<UserSearchView> searchUsers(String query, String roleParam) {
        Role role = null;
        if (roleParam != null && !roleParam.isBlank()) {
            try {
                role = Role.valueOf(roleParam.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new ApiException("Invalid role filter", HttpStatus.BAD_REQUEST);
            }
        }
        String q = query == null ? "" : query.trim();
        return userRepository.searchUsers(q, role).stream()
                .map(UserSearchView::new)
                .collect(Collectors.toList());
    }

    // ---- Update existing user profile by ID (works for USER, INSTITUTION and ADMIN) ----

    public AdminUserProfileView getUserProfile(Long userId) {
        return new AdminUserProfileView(getUserOrThrow(userId));
    }

    @Transactional
    public AdminUserProfileView updateUserProfile(Long userId, UpdateUserRequest req) {
        User user = getUserOrThrow(userId);

        if (!user.getEmail().equalsIgnoreCase(req.getEmail())
                && userRepository.existsByEmail(req.getEmail())) {
            throw new ApiException("Email already registered to another account", HttpStatus.CONFLICT);
        }

        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());
        if (user.getRole() == Role.INSTITUTION && req.getInstitutionName() != null && !req.getInstitutionName().isBlank()) {
            user.setInstitutionName(req.getInstitutionName());
        }
        if (req.getEnabled() != null) {
            user.setEnabled(req.getEnabled());
        }

        User saved = userRepository.save(user);
        return new AdminUserProfileView(saved);
    }

    private User getUserOrThrow(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found", HttpStatus.NOT_FOUND));
    }

    // ---- Permanent deletion (admin management) ----
    // These are hard, irreversible deletes - the frontend is expected to show
    // a confirmation prompt before calling any of them.

    /**
     * Permanently removes a card record. If it's currently linked to a
     * customer, the link is simply gone with it (the customer account itself
     * is untouched - use deleteCustomer to remove the account too).
     */
    @Transactional
    public void deleteCard(Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ApiException("Card not found", HttpStatus.NOT_FOUND));
        cardRepository.delete(card);
    }

    /**
     * Permanently removes a customer (USER) account: unlinks any card
     * registered to them (the physical card itself stays in the system,
     * unregistered, so it can be reissued), then deletes their wallet,
     * every transaction that touched that wallet, and finally the account.
     */
    @Transactional
    public void deleteCustomer(Long userId) {
        User user = getUserOrThrow(userId);
        if (user.getRole() != Role.USER) {
            throw new ApiException("Only customer accounts can be deleted with this action", HttpStatus.BAD_REQUEST);
        }

        List<Card> cards = cardRepository.findByUser(user);
        for (Card card : cards) {
            card.setUser(null);
            card.setRegistered(false);
            cardRepository.save(card);
        }

        walletRepository.findByOwner(user).ifPresent(wallet -> {
            List<Transaction> txs = transactionRepository.findByFromWalletOrToWalletOrderByTimestampDesc(wallet, wallet);
            transactionRepository.deleteAll(txs);
            walletRepository.delete(wallet);
        });

        userRepository.delete(user);
    }

    /**
     * Permanently removes an institution account. Order matters here because
     * of FK constraints: transactions reference the wallet (and, for
     * EXPENDITURE rows, the item), and item.institution_id is NOT NULL and
     * references app_user. So we delete child rows first, working inward:
     *   1. every transaction that touched this institution's wallet
     *      (this covers all EXPENDITURE transactions against its items too,
     *      since those always have this wallet as the "to" wallet)
     *   2. the wallet itself
     *   3. the institution's items (now unreferenced by any transaction)
     *   4. the institution's app_user row
     * Previously step 3 only flipped items to inactive instead of deleting
     * them, which left item.institution_id pointing at a row we were about
     * to delete - causing a foreign key violation on the final delete.
     */
    @Transactional
    public void deleteInstitution(Long userId) {
        User institution = getUserOrThrow(userId);
        if (institution.getRole() != Role.INSTITUTION) {
            throw new ApiException("Only institution accounts can be deleted with this action", HttpStatus.BAD_REQUEST);
        }

        walletRepository.findByOwner(institution).ifPresent(wallet -> {
            List<Transaction> txs = transactionRepository.findByFromWalletOrToWalletOrderByTimestampDesc(wallet, wallet);
            transactionRepository.deleteAll(txs);
            walletRepository.delete(wallet);
        });

        List<Item> items = itemRepository.findByInstitutionId(institution.getId());
        itemRepository.deleteAll(items);

        userRepository.delete(institution);
    }
}
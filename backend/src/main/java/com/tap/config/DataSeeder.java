package com.tap.config;

import com.tap.model.ApprovalStatus;
import com.tap.model.Role;
import com.tap.model.User;
import com.tap.model.Wallet;
import com.tap.repository.UserRepository;
import com.tap.repository.WalletRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Admins aren't self-registered (see AuthService.register), so there needs to
 * be a way to get the very first admin into the system. On startup, if no
 * ADMIN account exists yet, this creates one from the properties below so
 * you're not stuck writing raw SQL / bcrypt hashes by hand.
 *
 * Change app.admin.seed.username / password in application.properties (or via
 * env vars) before first run in any real environment, and rotate the password
 * immediately after first login - it goes through the same mandatory
 * change-credentials flow as everyone else.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.seed.username:admin}")
    private String seedUsername;

    @Value("${app.admin.seed.password:ChangeMe123!}")
    private String seedPassword;

    @Value("${app.admin.seed.email:admin@example.com}")
    private String seedEmail;

    public DataSeeder(UserRepository userRepository, WalletRepository walletRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        boolean adminExists = !userRepository.findByRole(Role.ADMIN).isEmpty();
        if (adminExists) {
            return;
        }

        User admin = new User();
        admin.setFullName("System Administrator");
        admin.setEmail(seedEmail);
        admin.setUsername(seedUsername);
        admin.setPasswordHash(passwordEncoder.encode(seedPassword));
        admin.setRole(Role.ADMIN);
        admin.setApprovalStatus(ApprovalStatus.APPROVED);
        admin.setEnabled(true);
        admin.setMustChangePassword(true);
        admin.setApprovedAt(LocalDateTime.now());
        User saved = userRepository.save(admin);

        // Admin doesn't move money, but every User row has a 1:1 Wallet in this
        // schema, so give it a zero-balance placeholder wallet too.
        Wallet wallet = new Wallet();
        wallet.setOwner(saved);
        wallet.setLabel(Wallet.WalletLabel.WALLET1);
        walletRepository.save(wallet);

        System.out.println("======================================================");
        System.out.println(" Seeded first admin account:");
        System.out.println("   username: " + seedUsername);
        System.out.println("   password: " + seedPassword);
        System.out.println(" You'll be forced to change these on first login.");
        System.out.println("======================================================");
    }
}

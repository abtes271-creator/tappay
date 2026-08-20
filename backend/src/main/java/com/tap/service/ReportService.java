package com.tap.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.tap.dto.TransactionView;
import com.tap.exception.ApiException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Builds downloadable activity reports (PDF / Excel) for an institution's
 * transaction history. Pure formatting layer - all the data it works with
 * (List<TransactionView>) already comes from WalletService, the same source
 * that feeds the in-app "Recent Activity" screen.
 */
@Service
public class ReportService {

    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public byte[] buildExcelReport(String institutionName, List<TransactionView> transactions) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Activity Report");

            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.TEAL.getIndex());
            headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);

            String[] columns = { "Date", "Type", "Item", "Amount", "Status" };
            Row header = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (TransactionView tx : transactions) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(tx.getTimestamp() != null ? tx.getTimestamp().format(TIMESTAMP_FORMAT) : "");
                row.createCell(1).setCellValue(tx.getType() != null ? tx.getType().name() : "");
                row.createCell(2).setCellValue(tx.getItemName() != null ? tx.getItemName() : "-");
                row.createCell(3).setCellValue(tx.getAmount() != null ? tx.getAmount().doubleValue() : 0.0);
                row.createCell(4).setCellValue(tx.isSuccessful() ? "Successful" : "Failed");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException("Failed to generate Excel report", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public byte[] buildPdfReport(String institutionName, List<TransactionView> transactions) {
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(11, 92, 86));
            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.GRAY);
            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, Color.DARK_GRAY);

            Paragraph title = new Paragraph("Activity Report", titleFont);
            title.setSpacingAfter(2);
            document.add(title);

            Paragraph subtitle = new Paragraph(institutionName + " · " + transactions.size() + " transaction"
                    + (transactions.size() == 1 ? "" : "s"), subFont);
            subtitle.setSpacingAfter(16);
            document.add(subtitle);

            PdfPTable table = new PdfPTable(new float[] { 2.2f, 1.4f, 2.4f, 1.4f, 1.6f });
            table.setWidthPercentage(100);

            for (String col : new String[] { "Date", "Type", "Item", "Amount", "Status" }) {
                PdfPCell cell = new PdfPCell(new Paragraph(col, headFont));
                cell.setBackgroundColor(new Color(11, 92, 86));
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_LEFT);
                table.addCell(cell);
            }

            boolean alt = false;
            for (TransactionView tx : transactions) {
                Color bg = alt ? new Color(244, 247, 246) : Color.WHITE;
                alt = !alt;

                table.addCell(bodyCell(tx.getTimestamp() != null ? tx.getTimestamp().format(TIMESTAMP_FORMAT) : "", bodyFont, bg));
                table.addCell(bodyCell(tx.getType() != null ? tx.getType().name() : "", bodyFont, bg));
                table.addCell(bodyCell(tx.getItemName() != null ? tx.getItemName() : "-", bodyFont, bg));
                table.addCell(bodyCell(tx.getAmount() != null ? "$" + tx.getAmount().toPlainString() : "-", bodyFont, bg));
                table.addCell(bodyCell(tx.isSuccessful() ? "Successful" : "Failed", bodyFont, bg));
            }

            if (transactions.isEmpty()) {
                PdfPCell empty = new PdfPCell(new Paragraph("No transactions to report.", bodyFont));
                empty.setColspan(5);
                empty.setPadding(10);
                table.addCell(empty);
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (IOException | com.lowagie.text.DocumentException e) {
            throw new ApiException("Failed to generate PDF report", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private PdfPCell bodyCell(String text, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setBackgroundColor(bg);
        cell.setPadding(6);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        return cell;
    }
}

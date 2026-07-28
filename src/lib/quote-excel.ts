import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  QUOTE_LINE_COUNT,
  QUOTE_LINE_START_ROW,
  type QuoteFormData,
  type QuoteItemInput,
} from "@/types/quote";
import { calculateQuoteTotals } from "@/lib/quote-calculator";

function setCell(
  ws: XLSX.WorkSheet,
  address: string,
  value: string | number | Date,
) {
  if (value instanceof Date) {
    ws[address] = { t: "d", v: value, w: value.toISOString().slice(0, 10) };
    return;
  }

  if (typeof value === "number") {
    ws[address] = { t: "n", v: value };
    return;
  }

  ws[address] = { t: "s", v: value };
}

function clearProductRow(ws: XLSX.WorkSheet, row: number) {
  const cols = ["A", "B", "D", "E", "F", "G", "H", "I", "J", "K", "L", "N", "O", "P", "R", "S", "T"];
  for (const col of cols) {
    delete ws[`${col}${row}`];
  }
}

function writeProductRow(ws: XLSX.WorkSheet, row: number, item: QuoteItemInput) {
  const consumerTotal = item.consumer_price * item.quantity;
  const purchaseTotal = item.purchase_price * item.quantity + item.shipping_cost;
  const margin = item.line_total - purchaseTotal;
  const marginRate =
    item.purchase_price > 0 ? item.sale_unit_price / item.purchase_price - 1 : 0;

  setCell(ws, `A${row}`, item.supplier);
  setCell(ws, `B${row}`, item.purchase_source);
  setCell(ws, `D${row}`, item.category);
  setCell(ws, `E${row}`, item.brand);
  setCell(ws, `F${row}`, item.product_name);
  setCell(ws, `G${row}`, item.model_name);
  setCell(ws, `H${row}`, item.quantity);
  setCell(ws, `I${row}`, item.consumer_price);
  setCell(ws, `J${row}`, consumerTotal);
  setCell(ws, `N${row}`, item.sale_unit_price);
  setCell(ws, `K${row}`, item.rounded_unit_price);
  setCell(ws, `L${row}`, item.line_total);
  setCell(ws, `O${row}`, item.purchase_price);
  setCell(ws, `P${row}`, item.shipping_cost);
  setCell(ws, `R${row}`, purchaseTotal);
  setCell(ws, `S${row}`, margin);
  setCell(ws, `T${row}`, marginRate);
}

export function buildQuoteWorkbook(data: QuoteFormData) {
  const templatePath = path.join(process.cwd(), "assets/quote-template.xlsx");
  const buffer = fs.readFileSync(templatePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = workbook.Sheets.MAIN;

  if (!ws) {
    throw new Error("견적서 템플릿 시트(MAIN)를 찾을 수 없습니다.");
  }

  const quoteDate = new Date(`${data.quote_date}T12:00:00`);
  const { totalAmount, cardAmount } = calculateQuoteTotals(data.items);

  setCell(ws, "L2", quoteDate);
  setCell(ws, "I4", data.customer_name);
  setCell(ws, "I5", data.customer_phone);
  setCell(ws, "I6", data.customer_address);
  setCell(ws, "I8", data.customer_email);
  setCell(ws, "I9", data.customer_note);
  setCell(
    ws,
    "D8",
    `담당 ${data.manager_name}`.trim(),
  );
  setCell(ws, "F32", data.manager_name);

  for (let i = 0; i < QUOTE_LINE_COUNT; i++) {
    clearProductRow(ws, QUOTE_LINE_START_ROW + i);
  }

  data.items.slice(0, QUOTE_LINE_COUNT).forEach((item, index) => {
    writeProductRow(ws, QUOTE_LINE_START_ROW + index, item);
  });

  setCell(ws, "L30", totalAmount);
  setCell(ws, "K11", totalAmount);
  setCell(ws, "L31", cardAmount);
  if (data.memo) {
    setCell(ws, "K32", data.memo);
  }

  ws["F11"] = {
    t: "s",
    f: 'TEXT(K11,"[DBNum4]")&"  원정"',
    v: "",
  };

  return workbook;
}

export function buildQuoteExcelBuffer(data: QuoteFormData) {
  const workbook = buildQuoteWorkbook(data);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildQuoteFileName(customerName: string, quoteDate: string) {
  const safeName = customerName.replace(/[\\/:*?"<>|]/g, "_").trim() || "고객";
  return `견적서_${safeName}_${quoteDate}.xlsx`;
}

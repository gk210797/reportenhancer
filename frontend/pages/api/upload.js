import multer from "multer";
import PDFParser from "pdf2json";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Needed to handle file uploads
  },
};

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// ✅ **Function to extract text from PDF**
const parsePDF = (pdfData) => {
  console.log("✅ Extracting text from PDF...");
  let extractedText = [];

  pdfData.Pages.forEach((page) => {
    page.Texts.forEach((text) => {
      extractedText.push(decodeURIComponent(text.R[0].T));
    });
  });

  console.log("📜 Extracted text:", extractedText);
  return extractedText;
};

// ✅ **Extract Metadata (Report Owner, Date, etc.)**
const extractMetadata = (extractedText) => {
  console.log("🔍 Extracting metadata...");
  let metadata = {};

  let metaIndex = extractedText.indexOf("Report Generated By  :");
  if (metaIndex !== -1) {
    metadata["Report Owner"] = extractedText[metaIndex + 1] || "";
  }

  let dateIndex = extractedText.indexOf("Generated On  :");
  if (dateIndex !== -1) {
    metadata["Generated on"] = extractedText[dateIndex + 1] || "";
  }

  let departmentIndex = extractedText.indexOf("Department Name:");
  if (departmentIndex !== -1) {
    metadata["Department Name"] = extractedText[departmentIndex + 1] || "";
  }

  console.log("📋 Extracted Metadata:", metadata);
  return metadata;
};

// ✅ **Extract Table Data Correctly**
const extractTableData = (extractedText) => {
  console.log("🛠 Extracting table headers and ticket data...");

  let headers = [
    "Ticket Id",
    "Site",
    "Created Time (Ticket)",
    "Priority (Ticket)",
    "Subject",
    "Contact Name",
    "Status (Ticket)",
  ];

  let dataStartIndex = extractedText.indexOf("Ticket Id");
  if (dataStartIndex === -1) {
    console.error("❌ Table headers not found!");
    return { headers: [], records: [] };
  }

  let ticketData = [];
  let currentTicket = {};
  let priorityIndex = -1; // Store the index where priority is found

  console.log("🔍 Data extraction starts at index:", dataStartIndex);
  let i = dataStartIndex + headers.length;

  while (i < extractedText.length) {
    let line = extractedText[i];

    console.log(`📝 Processing Line [${i}]:`, line);

    // 🛑 **Detecting a new ticket**
    if (!isNaN(line) && headers.includes("Ticket Id")) {
      console.log("📌 Detected a new Ticket ID:", line);

      if (Object.keys(currentTicket).length > 0) {
        ticketData.push(currentTicket);
        console.log("✅ Saved Ticket:", currentTicket);
      }

      // Reset ticket details
      currentTicket = {};
      priorityIndex = i + 3; // Store the index of "Priority (Ticket)"

      currentTicket["Ticket Id"] = line;
      currentTicket["Site"] = extractedText[i + 1] || "";
      currentTicket["Created Time (Ticket)"] = extractedText[i + 2] || "";
      currentTicket["Priority (Ticket)"] = extractedText[i + 3] || "";

      console.log("🎯 Extracted Ticket Fields:");
      console.log("  📌 Ticket ID:", currentTicket["Ticket Id"]);
      console.log("  📌 Site:", currentTicket["Site"]);
      console.log("  📌 Created Time:", currentTicket["Created Time (Ticket)"]);
      console.log("  📌 Priority:", currentTicket["Priority (Ticket)"]);

      i += 4; // Move index past known single-line values
      continue;
    }

    // 🟢 **Detect "Status"**
    if (line === "Closed" || line === "Open") {
      console.log("🟢 Detected Status:", line);

      currentTicket["Status (Ticket)"] = line;
      let contactIndex = i - 1;
      let contactName = extractedText[contactIndex] || "";

      console.log("🔍 Checking Possible Contact Name:", contactName);

      // **Detect Contact Name**
      if (/^[A-Za-z\s]+$/.test(contactName) && contactName.length < 50) {
        currentTicket["Contact Name"] = contactName;
        console.log("✅ Valid Contact Name:", contactName);
      } else {
        console.log("❌ Invalid Contact Name. Assigning empty.");
        currentTicket["Contact Name"] = "";
      }

      // 🔥 **Use `.slice()` to extract the subject correctly**
      let subjectStartIndex = priorityIndex + 1;
      let subjectEndIndex = contactIndex;

      currentTicket["Subject"] = extractedText.slice(subjectStartIndex, subjectEndIndex).join(" ");
      console.log("📝 Final Subject Extracted:", currentTicket["Subject"]);

      i++;
      continue;
    }

    i++;
  }

  // Add the last ticket
  if (Object.keys(currentTicket).length > 0) {
    ticketData.push(currentTicket);
    console.log("✅ Final Ticket Added:", currentTicket);
  }

  return { headers, records: ticketData };
};

// ✅ **Handle File Upload in Next.js API Route**
const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  upload.single("pdf")(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ error: "File upload error" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      console.log("🔄 Processing PDF...");
      let pdfParser = new PDFParser();
      pdfParser.parseBuffer(req.file.buffer);

      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        console.log("✅ PDF Parsing Completed!");

        let extractedText = parsePDF(pdfData);
        let metadata = extractMetadata(extractedText);
        let tableData = extractTableData(extractedText);

        console.log("📤 Sending Response to Frontend...");
        res.json({ success: true, metadata, tableData });
      });

      pdfParser.on("pdfParser_dataError", (err) => {
        console.error("❌ Error Parsing PDF:", err);
        res.status(500).json({ error: "Error processing PDF" });
      });
    } catch (error) {
      console.error("❌ Unexpected Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
};

export default handler;


import { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

const PdfUpload = () => {
  const [file, setFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const [processingDone, setProcessingDone] = useState(false);
  const [reportType, setReportType] = useState("zoho"); // Default: Zoho Desk PDF
  const [headers, setHeaders] = useState([]);


  const extractCrowdStrikeTableData = (detection) => {
    return {
      id: detection.id || "N/A",
      timestamp: detection.timestamp || "N/A",
      severity: detection.severity || "N/A",
      status: detection.status || "N/A",
      contactName: detection.user || "N/A",
      description: detection.description || "N/A"
    };
  };
  

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };
  const handleUpload = async () => {
    if (!file) return alert("Please select a file");
  
    setLoadingStep(1); // Start animation sequence

    if (reportType === "zoho") {
      // 🛠 Upload PDF to backend
      const formData = new FormData();
      formData.append("pdf", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();

        setMetadata(result.metadata);
        setTableData(result.tableData.records);
        setHeaders([
          "Ticket Id", 
          "Site", 
          "Created Time", 
          "Priority", 
          "Status", 
          "Contact Name", 
          "Subject"
        ]); // 🟢 Set headers for Zoho Desk reports
        console.log(result.metadata, result.tableData);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    } else if (reportType === "crowdstrike") {
      // 🛠 Process JSON in frontend
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          console.log("🛡️ Parsed CrowdStrike JSON:", jsonData);

          if (!Array.isArray(jsonData)) {
            throw new Error("Expected an array of objects in JSON!");
          }

          // 🟢 Set table headers for CrowdStrike JSON
          setHeaders([
            "ID",
            "Timestamp",
            "Severity",
            "Status",
            "Contact Name",
            "Description"
          ]);

          // Extract and store table data
          const tableRecords = jsonData.map(extractCrowdStrikeTableData);
          setTableData(tableRecords);

          console.log("📊 Extracted Table Data:", tableRecords);
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert("Invalid JSON file!");
        }
      };
      reader.readAsText(file);
    }

    // 🔄 Trigger animation steps with delays
    setTimeout(() => setLoadingStep(2), 1000);
    setTimeout(() => setLoadingStep(3), 2000);
    setTimeout(() => setLoadingStep(4), 3000);
    setTimeout(() => {
      setProcessingDone(true);
      setLoadingStep(0);
    }, 4000);
};


  

const downloadPDF = () => {
  if (tableData.length === 0) {
    alert("No data to download");
    return;
  }

  const doc = new jsPDF("p", "mm", "a4");

  // Add Company Logo
  const img = new Image();
  img.src = "/Horizontal-Color 2.png";
  doc.addImage(img, "PNG", 10, 10, 50, 20);

  // Add Metadata
  doc.setFontSize(12);
  doc.text(`Report Owner: ${metadata?.["Report Owner"] || "N/A"}`, 10, 50);
  doc.text(`Generated Date: ${metadata?.["Generated Date"] || "N/A"}`, 10, 60);
  doc.text(`Department Name: ${metadata?.["Department Name"] || "N/A"}`, 10, 70);

  let headers, formattedData, columnWidths;

  // 🔹 **Check if the report is Zoho or CrowdStrike**
  if (reportType === "zoho") {
    headers = ["Ticket Id", "Site", "Created Time", "Priority", "Status", "Contact Name", "Subject"];
    columnWidths = { 0: 30, 1: 30, 2: 40, 3: 20, 4: 30, 5: 30, 6: 80 };
  console.log(tableData)
    formattedData = tableData.map(row => [
      row["Ticket Id"], 
      row["Site"], 
      row["Created Time (Ticket)"], 
      row["Priority (Ticket)"], 
      row["Status (Ticket)"], 
      row["Contact Name"], 
      row["Subject"]
    ]);
  } else if (reportType === "crowdstrike") {
    headers = ["ID", "Timestamp", "Severity", "Status", "Description"];
    columnWidths = { 0: 60, 1: 35, 2: 20, 3: 25, 4: 90 };

    formattedData = tableData.map(row => [
      row["id"] ? row["id"].slice(0, 30) + "..." : "N/A", // Shorten long IDs
      row["timestamp"] || "N/A", 
      row["severity"] || "N/A", 
      row["status"] || "N/A", 
      row["description"] || "N/A"
    ]);
  }

  // **AutoTable with Proper Formatting**
  doc.autoTable({
    head: [headers],
    body: formattedData,
    startY: 80,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 2,
      overflow: "linebreak",
      halign: "center",
      valign: "middle",
    },
    headStyles: { fillColor: [41, 128, 185], fontSize: 11, halign: "center" },
    columnStyles: columnWidths,
  });

  doc.save(`${reportType}_report.pdf`);
};




  return (
    <div className="min-h-screen flex flex-col items-center text-black p-5">
      {/* Navbar */}
      <nav className="w-full bg-[#173030] p-4 flex justify-between items-center shadow-md fixed top-0">
        <img src="/Horizontal-Color 2.png" alt="Company Logo" className="h-10 ml-5" />
        <h1 className="text-white font-semibold text-lg">FHT Report Processor</h1>
        <div className="w-10"></div>
      </nav>

      {/* Upload Section */}
     {/* Upload Section */}
{/* Upload Section */}
{!processingDone && loadingStep === 0 && (
  <div className="mt-32 p-8 bg-white rounded-lg shadow-lg text-center w-[450px]">
    <h2 className="text-2xl font-bold text-[#173030] mb-4">Upload Report</h2>

    {/* Dropdown to Select Report Type */}
    <label className="block text-black text-sm font-semibold mb-2">Select Report Type:</label>
    <select 
      className="border border-gray-300 p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008080] text-black"
      value={reportType}
      onChange={(e) => setReportType(e.target.value)}
    >
      <option value="zoho">📄 Zoho Desk PDF</option>
      <option value="crowdstrike">🛡️ CrowdStrike JSON</option>
    </select>

    {/* File Upload */}
    <div className="mt-4 flex items-center justify-center border border-gray-300 rounded-lg p-3 w-full">
      <input type="file" onChange={handleFileChange} className="text-black" />
    </div>

    {/* Upload Button */}
    <button 
      onClick={handleUpload} 
      className="bg-[#008080] text-white font-semibold px-6 py-2 rounded-lg hover:bg-[#005555] mt-4 w-full transition-all"
    >
      🚀 Upload
    </button>
  </div>
)}



      {/* Loader Centered */}
     {/* Loader Centered */}
{loadingStep > 0 && !processingDone && (
  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex justify-center space-x-10 text-[#173030]">
    <span className={`letter ${loadingStep >= 1 ? "rotate" : ""}`}>F</span>
    <span className={`letter ${loadingStep >= 2 ? "rotate" : "hidden"}`}>H</span>
    <span className={`letter ${loadingStep >= 3 ? "rotate" : "hidden"}`}>T</span>
  </div>
)}


      {/* Table & Download Button Appear After Loader */}
      {processingDone && (
  <div className="mt-20 w-4/5 overflow-x-auto">
    <button onClick={downloadPDF} className="bg-[#FF4500] text-white px-6 py-2 ml-2 rounded-lg hover:bg-red-700 mb-4">
      Download PDF
    </button>
    <table className="table-auto border-collapse border border-gray-500 w-full text-black">
      <thead>
        <tr className="bg-[#173030] text-white">
          {headers.map(header => (
            <th key={header} className="border border-gray-500 px-6 py-3 text-left">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableData.map((row, index) => (
          <tr key={index} className={`text-left ${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}>
            {Object.values(row).map((cell, i) => (
              <td key={i} className="border border-gray-500 px-6 py-3">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

    </div>
  );
};

export default PdfUpload;





import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { unparse } from 'papaparse';

const API_URL = process.env.REACT_APP_API_URL

function App() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleCrawl = async () => {
    console.log(API_URL)
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(json)

        const response = await axios.post(API_URL + '/crawl', json, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const processedData = response.data;

        console.log(processedData)

        // CSV 변환
        const csv = unparse(processedData);

        // CSV 파일로 저장
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'results.csv');
        document.body.appendChild(link);
        link.click();
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error during file processing:', error);
    }
  };

  return (
    <div className="App">
      <h1>File Crawler</h1>
      <input type="file" onChange={handleFileChange} accept=".xlsx" />
      <button onClick={handleCrawl}>Start Crawling</button>
    </div>
  );
}


export default App;


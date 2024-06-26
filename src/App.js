import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { unparse } from 'papaparse';

const API_URL = process.env.REACT_APP_API_URL;

function App() {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState("keyword");
  const [crawlResults, setCrawlResults] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleCrawl = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setCurrentKeyword("");
    setCrawlResults([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const filteredData = json.filter(row => row.length === 2 && row[0] && row[1]);

        const groupedData = filteredData.reduce((acc, row) => {
          const keyword = row[0];
          const blogId = row[1];
          if (!acc[keyword]) {
            acc[keyword] = [];
          }
          acc[keyword].push(blogId);
          return acc;
        }, {});

        const keywords = Object.keys(groupedData);
        const totalRequests = keywords.length;
        let allResults = [];

        for (let i = 0; i < totalRequests; i++) {
          const keyword = keywords[i];
          setCurrentKeyword(keyword);
          const blogIds = groupedData[keyword];
          try {
            const response = await axios.post(API_URL + '/crawl', { keyword, blog_ids: blogIds }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            allResults = allResults.concat(response.data);
          } catch (error) {
            console.error(`Error for keyword ${keyword}:`, error);
          }
          setProgress(((i + 1) / totalRequests) * 100);
          await delay(100);
        }

        setCrawlResults(allResults);
        setIsLoading(false);
        setCurrentKeyword("");
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error during file processing:', error);
    }
  };

  const handleDownload = () => {
    let processedData;
    if (viewMode === "keyword") {
      processedData = crawlResults.map(result => ({
        Keyword: result.Keyword,
        BlogID: result["Blog ID"],
        Section: result.Section,
        Position: result.Position,
        Title: result.Title,
      }));
    } else {
      processedData = crawlResults.map(result => ({
        BlogID: result["Blog ID"],
        Keyword: result.Keyword,
        Section: result.Section,
        Position: result.Position,
        Title: result.Title,
      }));
    }

    const csv = unparse(processedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'results.csv');
    document.body.appendChild(link);
    link.click();
  };

  useEffect(() => {
    if (isLoading) {
      console.log(`Current keyword: ${currentKeyword}, Progress: ${progress.toFixed(2)}%`);
    }
  }, [currentKeyword, progress, isLoading]);

  return (
    <div className="App">
      <h1>Simple Naver Blog Crawler</h1>
      <input type="file" onChange={handleFileChange} accept=".xlsx" />
      <button onClick={handleCrawl} disabled={isLoading}>
        {isLoading ? 'Crawling...' : 'Start Crawling'}
      </button>
      {isLoading && <p>Current keyword: {currentKeyword}</p>}
      {isLoading && <p>Progress: {progress.toFixed(2)}%</p>}
      <div>
        <label>
          <input
            type="radio"
            value="keyword"
            checked={viewMode === "keyword"}
            onChange={() => setViewMode("keyword")}
          />
          View by Keyword
        </label>
        <label>
          <input
            type="radio"
            value="id"
            checked={viewMode === "id"}
            onChange={() => setViewMode("id")}
          />
          View by ID
        </label>
      </div>
      <button onClick={handleDownload} disabled={isLoading || !crawlResults.length}>
        Download Results
      </button>
    </div>
  );
}

export default App;

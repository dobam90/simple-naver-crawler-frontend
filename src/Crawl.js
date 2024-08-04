import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ref, update, get } from 'firebase/database';
import { database } from './firebase';
import * as XLSX from 'xlsx';  // XLSX 라이브러리 가져오기

const API_URL = process.env.REACT_APP_API_URL;

function Crawl({ fileData }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [progress, setProgress] = useState(0);
  const [crawlResults, setCrawlResults] = useState({});
  const [lastIndex, setLastIndex] = useState(0); // 마지막으로 멈춘 인덱스
  const shouldStop = useRef(false);

  useEffect(() => {
    loadCrawlResults();
  }, [fileData.id]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const loadCrawlResults = async () => {
    const dbRef = ref(database, `fileData/${fileData.id}/results`);
    const snapshot = await get(dbRef);
    if (snapshot.exists()) {
      const results = snapshot.val();
      setCrawlResults(results);
      setLastIndex(Object.keys(results).length);
    }
  };

  const handleCrawl = async (continueFromLast) => {
    setIsLoading(true);
    setProgress(0);
    setCurrentKeyword("");
    shouldStop.current = false;

    try {
      const filteredData = fileData.data.slice(1).filter(row => Array.isArray(row) && row.length === 2 && row[0] && row[1]);

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
      let allResults = continueFromLast ? { ...crawlResults } : {};
      let startIndex = continueFromLast ? lastIndex : 0;

      for (let i = startIndex; i < totalRequests; i++) {
        if (shouldStop.current) {
          setLastIndex(i); // 크롤링 멈춘 위치 저장
          break;
        }

        const keyword = keywords[i];
        setCurrentKeyword(keyword);
        const blogIds = groupedData[keyword];
        try {
          const response = await axios.post(API_URL + '/crawl', { keyword, blog_ids: blogIds }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          const newResults = response.data.map((res) => ({
            ...res,
            keyword,
            blogIds
          }));
          if (!allResults[keyword]) {
            allResults[keyword] = [];
          }
          allResults[keyword] = allResults[keyword].concat(newResults);

          // Firebase에 결과 업데이트
          const dbRef = ref(database, `fileData/${fileData.id}/results`);
          const updates = {};
          updates[keyword] = allResults[keyword];
          await update(dbRef, updates);

          setCrawlResults(allResults);
        } catch (error) {
          console.error(`Error for keyword ${keyword}:`, error);
        }
        setProgress(((i + 1) / totalRequests) * 100);
        await delay(1000);
      }

      setIsLoading(false);
      setCurrentKeyword("");
    } catch (error) {
      console.error('Error during file processing:', error);
    }
  };

  const handleStop = () => {
    shouldStop.current = true;
    setIsLoading(false);
  };

  const handleDownload = () => {
    const headers = ["#", "Keyword", "BlogID", "Case", "Section", "Theme", "Position", "Title"];
    const dataToDownload = [headers];
    fileData.data.slice(1).forEach((row) => {
      if (Array.isArray(row)) {
        const results = crawlResults[row[0]];
        if (results && results.length > 0) {
          results.forEach(result => {
            dataToDownload.push([row[0], row[1], result["Blog ID"], result.Case, result.Section, result.Theme, result.Position, result.Title]);
          });
        } else {
          dataToDownload.push(row);
        }
      } else {
        dataToDownload.push(Object.values(row));
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dataToDownload);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
    XLSX.writeFile(workbook, "crawl_results.xlsx");
  };

  return (
    <div>
      <h2>크롤링</h2>
      <button onClick={() => handleCrawl(false)} disabled={isLoading}>
        {isLoading ? 'Crawling...' : '처음부터 크롤링 시작'}
      </button>
      <button onClick={() => handleCrawl(true)} disabled={isLoading}>
        {isLoading ? 'Crawling...' : '이어하기'}
      </button>
      <button onClick={handleStop} disabled={!isLoading}>
        중지
      </button>
      <button onClick={handleDownload} disabled={Object.keys(crawlResults).length === 0}>
        다운로드
      </button>
      {isLoading && <p>Current keyword: {currentKeyword}</p>}
      {isLoading && <p>Progress: {progress.toFixed(2)}%</p>}
      <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black' }}>#</th>
              <th style={{ border: '1px solid black' }}>Keyword</th>
              <th style={{ border: '1px solid black' }}>BlogID</th>
              <th style={{ border: '1px solid black' }}>Case</th>
              <th style={{ border: '1px solid black' }}>Section</th>
              <th style={{ border: '1px solid black' }}>Theme</th>
              <th style={{ border: '1px solid black' }}>Position</th>
              <th style={{ border: '1px solid black' }}>Title</th>
            </tr>
          </thead>
          <tbody>
            {fileData.data.slice(1).flatMap((row, rowIndex) => {
              if (Array.isArray(row)) {
                const results = crawlResults[row[0]];
                if (results && results.length > 0) {
                  return results.map((result, resultIndex) => (
                    <tr key={`${rowIndex}-${resultIndex}`}>
                      <td style={{ border: '1px solid black' }}>{rowIndex + 1}</td>
                      <td style={{ border: '1px solid black' }}>{row[0]}</td>
                      <td style={{ border: '1px solid black' }}>{row[1]}</td>
                      <td style={{ border: '1px solid black' }}>{result.Case}</td>
                      <td style={{ border: '1px solid black' }}>{result.Section}</td>
                      <td style={{ border: '1px solid black' }}>{result.Theme}</td>
                      <td style={{ border: '1px solid black' }}>{result.Position}</td>
                      <td style={{ border: '1px solid black' }}>{result.Title}</td>
                    </tr>
                  ));
                } else {
                  return (
                    <tr key={rowIndex}>
                      <td style={{ border: '1px solid black' }}>{rowIndex + 1}</td>
                      <td style={{ border: '1px solid black' }}>{row[0]}</td>
                      <td style={{ border: '1px solid black' }}>{row[1]}</td>
                      <td style={{ border: '1px solid black' }} colSpan="6">No Result</td>
                    </tr>
                  );
                }
              } else {
                return (
                  <tr key={rowIndex}>
                    <td style={{ border: '1px solid black' }}>{rowIndex + 1}</td>
                    <td style={{ border: '1px solid black' }} colSpan="7">Invalid row data</td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Crawl;

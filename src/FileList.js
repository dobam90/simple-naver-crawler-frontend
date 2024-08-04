import React, { useState, useEffect } from 'react';
import { ref, set, push, onValue } from 'firebase/database';
import { database } from './firebase';
import * as XLSX from 'xlsx';

function FileList({ onFileSelect }) {
  const [file, setFile] = useState(null);
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    const dbRef = ref(database, 'fileData');
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const files = [];
        snapshot.forEach((childSnapshot) => {
          const fileData = childSnapshot.val();
          files.push({ id: childSnapshot.key, ...fileData });
        });
        setFileList(files);
      }
    });
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const dbRef = ref(database, 'fileData');
      const newFileRef = push(dbRef);
      set(newFileRef, { data: json, timestamp: Date.now(), fileName: file.name });

      alert('File uploaded successfully!');
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h2>데이터 목록</h2>
      <input type="file" onChange={handleFileChange} accept=".xlsx" />
      <button onClick={handleFileUpload}>파일 업로드</button>
      <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid black', textAlign: 'center' }}>#</th>
              <th style={{ border: '1px solid black', textAlign: 'center' }}>File Name</th>
              <th style={{ border: '1px solid black', textAlign: 'center' }}>Upload Time</th>
            </tr>
          </thead>
          <tbody>
            {fileList.map((file, index) => (
              <tr key={file.id} onClick={() => onFileSelect(file)}>
                <td style={{ border: '1px solid black', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid black', textAlign: 'center', cursor: 'pointer' }}>{file.fileName}</td>
                <td style={{ border: '1px solid black', textAlign: 'center' }}>{new Date(file.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FileList;

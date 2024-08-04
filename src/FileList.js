import React, { useState } from 'react';
import { ref, set, push } from 'firebase/database';
import { database } from './firebase';
import * as XLSX from 'xlsx';

function FileList({ fileList, onFileSelect, onFileUpload }) {
  const [file, setFile] = useState(null);

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
      onFileUpload();
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <h2>데이터 목록</h2>
      <input type="file" onChange={handleFileChange} accept=".xlsx" />
      <button onClick={handleFileUpload}>파일 업로드</button>
      <ul style={{ maxHeight: '400px', overflowY: 'scroll' }}>
        {fileList.map(file => (
          <li key={file.id} onClick={() => onFileSelect(file)}>
            {file.fileName}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FileList;

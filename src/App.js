import React, { useState, useEffect } from 'react';
import { ref, get, child } from 'firebase/database';
import { database } from './firebase';
import FileList from './FileList';
import Crawl from './Crawl';

function App() {
  const [activeTab, setActiveTab] = useState('fileList');
  const [selectedFileData, setSelectedFileData] = useState(null);
  const [fileList, setFileList] = useState([]);

  const fetchFileList = async () => {
    const dbRef = ref(database);
    const snapshot = await get(child(dbRef, 'fileData'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      const files = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => b.timestamp - a.timestamp);
      setFileList(files);
    }
  };

  const handleFileSelect = (fileData) => {
    setSelectedFileData(fileData);
    setActiveTab('crawl');
  };

  useEffect(() => {
    fetchFileList();
  }, []);

  return (
    <div className="App">
      <div>
        <button onClick={() => setActiveTab('fileList')}>데이터 목록</button>
        <button onClick={() => setActiveTab('crawl')} disabled={!selectedFileData}>크롤링</button>
      </div>
      {activeTab === 'fileList' && (
        <FileList
          fileList={fileList}
          onFileSelect={handleFileSelect}
          onFileUpload={fetchFileList}
        />
      )}
      {activeTab === 'crawl' && selectedFileData && (
        <Crawl fileData={selectedFileData} />
      )}
    </div>
  );
}

export default App;

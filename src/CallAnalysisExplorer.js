import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';

const CallAnalysisExplorer = () => {
  const [callData, setCallData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDisposition, setSelectedDisposition] = useState(null);
  const [categoryData, setCategoryData] = useState({});
  const [notesForDisposition, setNotesForDisposition] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch the CSV file from the public folder
        const response = await fetch('/Orum Calls Jan 1 to Mar 4 2025.csv');
        const text = await response.text();
        
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            processData(results.data);
            setLoading(false);
          },
          error: (error) => {
            setError(`Error parsing CSV: ${error}`);
            setLoading(false);
          }
        });
      } catch (error) {
        setError(`Error loading file: ${error}`);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processData = (data) => {
    const filteredData = data.filter(row => row.Disposition !== "cancelled");
    setCallData(filteredData);
    
    // Create disposition categories
    const categories = {
      "No Contact": ["cancelled", "No Answer", "no answer"],
      "Voicemail": ["Left Voicemail", "went to voicemail"],
      "Connected - Feedback": ["Answered - Connected - Business Has Not Started Yet", "Answered - Connected - Enjoys Found"],
      "Connected - Questions": [
        "Answered - Connected - Feature Exploration/Request", 
        "Answered - Connected - Funding Questions", 
        "Answered - Connected - Credit / Lending Interest", 
        "Answered - Connected - No Questions", 
        "Answered - Connected - Integration (3rd Party) Questions", 
        "Answered - Provided Found Overview"
      ],
      "Connected - Technical": ["Answered - Connected - Activation Issues", "Answered - Connected - Technical Issues"],
      "Wrong Contact": ["Answered - Wrong Person, Gave Referral", "Answered - Wrong Person, No Referral", "Wrong Phone #"],
      "Busy/DNC": ["Busy Call Later / Send Follow Up", "Do Not Disturb - DNC", "Busy - Call Later", "Hook Rejected"],
      "Other": ["No Disposition"]
    };
    
    // Count by disposition
    const dispositionCounts = _.countBy(filteredData, 'Disposition');
    
    // Organize by category
    const categoryResults = {};
    
    Object.entries(categories).forEach(([category, dispositions]) => {
      const categoryDispositions = {};
      let total = 0;
      
      dispositions.forEach(disp => {
        if (dispositionCounts[disp]) {
          categoryDispositions[disp] = dispositionCounts[disp];
          total += dispositionCounts[disp];
        }
      });
      
      if (total > 0) {
        categoryResults[category] = {
          dispositions: categoryDispositions,
          total
        };
      }
    });
    
    setCategoryData(categoryResults);
  };
  
  const handleDispositionClick = (disposition) => {
    setSelectedDisposition(disposition);
    
    // Find notes for this disposition
    const notes = callData
      .filter(call => call.Disposition === disposition && call.Note)
      .map(call => call.Note)
      .slice(0, 100); // Limit to 100 notes for performance
    
    setNotesForDisposition(notes);
  };
  
  const handleBackClick = () => {
    setSelectedDisposition(null);
    setNotesForDisposition([]);
  };
  
  const analyzeDispositionNotes = (notes) => {
    // Simple keyword extraction
    const wordCounts = {};
    const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'is', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'that', 'this', 'it', 'as', 'be', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'has', 'have', 'had', 'do', 'does', 'did', 'i', 'you', 'he', 'she', 'they', 'we', 'their', 'our', 'your', 'my', 'his', 'her', 'its']);
    
    notes.forEach(note => {
      if (!note) return;
      
      const words = note.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word));
      
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });
    
    // Sort by frequency
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-xl">Loading call data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Found Call Analysis Explorer</h1>
      
      {selectedDisposition ? (
        // Disposition detail view
        <div>
          <button 
            className="mb-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded flex items-center"
            onClick={handleBackClick}
          >
            <span className="mr-2">←</span> Back to Categories
          </button>
          
          <h2 className="text-2xl font-semibold mb-4">{selectedDisposition}</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3">Common Keywords</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {analyzeDispositionNotes(notesForDisposition).map(([word, count]) => (
                <span 
                  key={word} 
                  className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm"
                >
                  {word} ({count})
                </span>
              ))}
            </div>
            
            <h3 className="text-xl font-medium mb-3">Call Notes ({notesForDisposition.length})</h3>
            <div className="space-y-4">
              {notesForDisposition.length > 0 ? (
                notesForDisposition.map((note, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <p className="whitespace-pre-line">{note}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No notes available for this disposition.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Category overview
        <div>
          <h2 className="text-2xl font-semibold mb-4">Disposition Breakdown by Category</h2>
          <div className="space-y-6">
            {Object.entries(categoryData)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([category, data]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <div className="bg-green-700 text-white px-4 py-3">
                    <h3 className="font-medium text-lg flex justify-between">
                      <span>{category}</span>
                      <span>{data.total.toLocaleString()} calls ({((data.total / callData.length) * 100).toFixed(1)}%)</span>
                    </h3>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2">
                      {Object.entries(data.dispositions)
                        .sort((a, b) => b[1] - a[1])
                        .map(([disposition, count]) => (
                          <li key={disposition} className="flex justify-between items-center">
                            <button 
                              className="text-green-700 hover:text-green-900 text-left font-medium"
                              onClick={() => handleDispositionClick(disposition)}
                            >
                              {disposition}
                            </button>
                            <span className="text-gray-600">
                              {count.toLocaleString()} ({((count / callData.length) * 100).toFixed(1)}%)
                            </span>
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default CallAnalysisExplorer;

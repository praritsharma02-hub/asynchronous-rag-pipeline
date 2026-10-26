import React, { useState } from 'react';

export default function App() {
    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [statusColor, setStatusColor] = useState("green");
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    // 1. File Upload Handler (BullMQ Producer)
    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please select a PDF file first");

        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploadStatus("Uploading PDF to queue...");
            setStatusColor("blue");
            
            const res = await fetch('http://localhost:3000/api/documents/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                throw new Error(`Server responded with status: ${res.status}`);
            }
            
            const data = await res.json();
            setUploadStatus(`Uploaded successfully! Job ID: ${data.jobId}. Worker is generating embeddings in background...`);
            setStatusColor("green");
        } catch (err) {
            console.error(err);
            setUploadStatus("File upload failed. (Check console or backend CORS)");
            setStatusColor("red");
        }
    };

    // 2. Real-time Streaming Chat Handler (ReadableStream getReader)
    const handleChat = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setAnswer("");
        setIsStreaming(true);

        try {
            const response = await fetch('http://localhost:3000/api/documents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.body) throw new Error("ReadableStream not supported!");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunkText = decoder.decode(value, { stream: true });
                setAnswer((prev) => prev + chunkText);
            }
        } catch (error) {
            console.error("Streaming error:", error);
            setAnswer("Error connecting to the chat endpoint.");
        } finally {
            setIsStreaming(false);
        }
    };

    return (
        <div style={{ padding: "40px", maxWidth: "700px", margin: "auto", fontFamily: "sans-serif" }}>
            <h2>Enterprise RAG Document Pipeline</h2>

            {/* Section 1: Upload PDF */}
            <div style={{ padding: "20px", border: "1px solid #ddd", marginBottom: "30px", borderRadius: "8px" }}>
                <h3>1. Upload PDF Document</h3>
                <form onSubmit={handleFileUpload}>
                    <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
                    <button type="submit" style={{ marginLeft: "10px", padding: "6px 12px" }}>Upload</button>
                </form>
                {uploadStatus && <p style={{ color: statusColor, marginTop: "10px" }}>{uploadStatus}</p>}
            </div>

            {/* Section 2: Query & Streaming Chat */}
            <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
                <h3>2. Query Document (Real-time LLM Response)</h3>
                <form onSubmit={handleChat}>
                    <input 
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Ask anything from the document..."
                        style={{ width: "70%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
                    />
                    <button 
                        type="submit" 
                        disabled={isStreaming} 
                        style={{ marginLeft: "10px", padding: "10px 16px", cursor: "pointer" }}
                    >
                        {isStreaming ? "Streaming..." : "Send"}
                    </button>
                </form>

                <div style={{ 
                    marginTop: "20px", 
                    whiteSpace: "pre-wrap", 
                    border: "1px solid #ccc", 
                    padding: "16px", 
                    minHeight: "120px",
                    background: "#f9f9f9",
                    borderRadius: "4px"
                }}>
                    {answer || "LLM Response will stream here chunk-by-chunk..."}
                </div>
            </div>
        </div>
    );
}
// import React, { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import toast, { Toaster } from "react-hot-toast";
// import { useDropzone } from "react-dropzone";
// import {
//   FiFileText,
//   FiUploadCloud,
//   FiDownload,
//   FiShare2,
//   FiTrash2,
//   FiLoader,
//   FiEdit,
//   FiX,
// } from "react-icons/fi";
// import { FaFilePdf, FaFileWord, FaFileImage } from "react-icons/fa";

// // --- API Configuration ---
// const API_BASE = "http://localhost:3000";

// // --- Helper Functions ---
// const formatBytes = (bytes, decimals = 2) => {
//   if (!+bytes) return "0 Bytes";
//   const k = 1024;
//   const dm = decimals < 0 ? 0 : decimals;
//   const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
// };

// const formatDate = (dateString) => {
//   return new Date(dateString).toLocaleDateString("en-US", {
//     year: "numeric",
//     month: "long",
//     day: "numeric",
//   });
// };

// const getFileIcon = (fileName) => {
//   if (!fileName) return <FiFileText className="text-gray-500" />;
//   const extension = fileName.split(".").pop().toLowerCase();
//   if (extension === "pdf") return <FaFilePdf className="text-red-500" />;
//   if (extension === "docx") return <FaFileWord className="text-blue-500" />;
//   if (["jpg", "jpeg", "png"].includes(extension)) {
//     return <FaFileImage className="text-green-500" />;
//   }
//   return <FiFileText className="text-gray-500" />;
// };

// // --- Main App Component ---
// export default function App() {
//   const [files, setFiles] = useState([]);

//   // Consolidated State Management
//   const [modalState, setModalState] = useState({
//     showDelete: false,
//     showRename: false,
//     showConfirmUpload: false,
//   });
//   const [isProcessing, setIsProcessing] = useState({
//     analyzing: false,
//     uploading: false,
//     renaming: false,
//   });

//   // State for specific actions
//   const [fileToDelete, setFileToDelete] = useState(null);
//   const [fileToRename, setFileToRename] = useState(null);
//   const [newFileName, setNewFileName] = useState("");
//   const [fileToUpload, setFileToUpload] = useState(null);
//   const [analysisResult, setAnalysisResult] = useState(null);
//   const [editedFilename, setEditedFilename] = useState("");

//   const fetchFiles = useCallback(async () => {
//     try {
//       const res = await axios.get(`${API_BASE}/files`);
//       setFiles(res.data);
//     } catch (error) {
//       console.error("Error fetching files:", error);
//       toast.error("Could not fetch files.");
//     }
//   }, []);

//   useEffect(() => {
//     fetchFiles();
//   }, [fetchFiles]);

//   // --- AI Analysis and Upload Flow ---
//   const handleFileAnalysis = async (file) => {
//     setFileToUpload(file);
//     setIsProcessing((prev) => ({ ...prev, analyzing: true }));

//     const formData = new FormData();
//     formData.append("file", file);

//     try {
//       const res = await axios.post(`${API_BASE}/analyze-file`, formData);
//       setAnalysisResult(res.data);
//       setEditedFilename(res.data.descriptiveFilename);
//       setModalState((prev) => ({ ...prev, showConfirmUpload: true }));
//     } catch (error) {
//       toast.error("AI analysis failed. Please try again.");
//       console.error("Analysis error:", error);
//     } finally {
//       setIsProcessing((prev) => ({ ...prev, analyzing: false }));
//     }
//   };

//   const handleFinalUpload = async () => {
//     if (!fileToUpload || !analysisResult) return;

//     const finalFilename = `${editedFilename}.${analysisResult.extension}`;

//     const formData = new FormData();
//     formData.append("file", fileToUpload);
//     formData.append("descriptiveFilename", finalFilename);
//     // ✨ Send tags and categories to the backend ✨
//     formData.append("tags", JSON.stringify(analysisResult.tags));
//     formData.append("categories", JSON.stringify(analysisResult.categories));

//     setIsProcessing((prev) => ({ ...prev, uploading: true }));
//     const uploadToast = toast.loading("Uploading your file...");

//     try {
//       await axios.post(`${API_BASE}/upload`, formData);
//       toast.success("File uploaded successfully!", { id: uploadToast });
//       fetchFiles();
//       setModalState((prev) => ({ ...prev, showConfirmUpload: false }));
//     } catch (error) {
//       const errorMessage = error.response?.data?.error || "File upload failed.";
//       toast.error(errorMessage, { id: uploadToast });
//     } finally {
//       setIsProcessing((prev) => ({ ...prev, uploading: false }));
//       setFileToUpload(null);
//       setAnalysisResult(null);
//       setEditedFilename("");
//     }
//   };

//   const onDrop = useCallback((acceptedFiles) => {
//     if (acceptedFiles.length > 0) {
//       handleFileAnalysis(acceptedFiles[0]);
//     }
//   }, []);

//   const { getRootProps, getInputProps, isDragActive } = useDropzone({
//     onDrop,
//     accept: {
//       "image/jpeg": [],
//       "image/png": [],
//       "application/pdf": [],
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
//         [],
//     },
//     maxSize: 5 * 1024 * 1024,
//     multiple: false,
//     onDropRejected: (fileRejections) => {
//       const file = fileRejections[0].file;
//       const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2); // Convert bytes to MB

//       toast.error(`File is too large: ${fileSizeMB} MB. Max allowed is 5 MB.`);
//     },
//   });

//   // --- Standard File Actions (Delete, Rename, Share) ---
//   const handleDeleteClick = (fileName) => {
//     setFileToDelete(fileName);
//     setModalState((prev) => ({ ...prev, showDelete: true }));
//   };

//   const confirmDelete = async () => {
//     if (!fileToDelete) return;
//     try {
//       await axios.delete(`${API_BASE}/files/${fileToDelete}`);
//       toast.success("File deleted successfully!");
//       fetchFiles();
//     } catch (error) {
//       console.error("Delete error:", error);
//       toast.error("Failed to delete the file.");
//     } finally {
//       setModalState((prev) => ({ ...prev, showDelete: false }));
//       setFileToDelete(null);
//     }
//   };

//   const handleRenameClick = (fileName) => {
//     const nameParts = fileName.split(".");
//     const extension = nameParts.pop();
//     const baseName = nameParts.join(".");
//     setFileToRename({ oldName: fileName, extension });
//     setNewFileName(baseName);
//     setModalState((prev) => ({ ...prev, showRename: true }));
//   };

//   const confirmRename = async () => {
//     if (!fileToRename || !newFileName.trim()) {
//       return toast.error("New file name cannot be empty.");
//     }

//     const finalNewName = `${newFileName.trim()}.${fileToRename.extension}`;

//     setIsProcessing((prev) => ({ ...prev, renaming: true }));
//     try {
//       await axios.put(`${API_BASE}/files/${fileToRename.oldName}`, {
//         newName: finalNewName,
//       });
//       toast.success("File renamed successfully!");
//       fetchFiles();
//       setModalState((prev) => ({ ...prev, showRename: false }));
//     } catch (error) {
//       console.error("Rename error:", error);
//       toast.error("Failed to rename the file.");
//     } finally {
//       setIsProcessing((prev) => ({ ...prev, renaming: false }));
//       setFileToRename(null);
//       setNewFileName("");
//     }
//   };

//   const handleShare = (url) => {
//     navigator.clipboard.writeText(url);
//     toast.success("Link copied to clipboard!");
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
//       <Toaster
//         position="top-center"
//         reverseOrder={false}
//         toastOptions={{
//           style: { background: "#333", color: "#fff" },
//           success: { iconTheme: { primary: "#8B5CF6", secondary: "white" } },
//         }}
//       />

//       {(isProcessing.analyzing || isProcessing.uploading) && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="text-center text-white">
//             <FiLoader className="animate-spin text-6xl mx-auto" />
//             <p className="mt-4 text-lg">
//               {isProcessing.analyzing
//                 ? "AI is analyzing your file..."
//                 : "Uploading..."}
//             </p>
//           </div>
//         </div>
//       )}

//       {/* AI Upload Confirmation Modal */}
//       {modalState.showConfirmUpload && analysisResult && (
//         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl relative">
//             <button
//               onClick={() =>
//                 setModalState((prev) => ({ ...prev, showConfirmUpload: false }))
//               }
//               className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
//             >
//               <FiX size={24} />
//             </button>
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">
//               Confirm File Upload
//             </h2>

//             <div className="bg-gray-100/60 rounded-xl p-4 flex items-center gap-4 mb-8">
//               <div className="text-4xl text-gray-500">
//                 {getFileIcon(fileToUpload.name)}
//               </div>
//               <p className="font-mono text-gray-600">
//                 {formatBytes(fileToUpload.size)}
//               </p>
//             </div>

//             <div className="space-y-6">
//               <div>
//                 <label className="text-sm font-semibold text-gray-600 mb-2 block">
//                   Descriptive Filename
//                 </label>
//                 <div className="flex items-center">
//                   <input
//                     type="text"
//                     value={editedFilename}
//                     onChange={(e) => setEditedFilename(e.target.value)}
//                     className="flex-grow p-3 border-2 border-purple-400 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
//                   />
//                   <span className="bg-gray-200 text-gray-700 px-4 py-3 border-2 border-gray-200 border-l-0 rounded-r-lg">
//                     .{analysisResult.extension}
//                   </span>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-semibold text-gray-600 mb-2 block">
//                   Suggested Categories
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                   {analysisResult.categories.map((cat) => (
//                     <span
//                       key={cat}
//                       className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
//                     >
//                       {cat}
//                     </span>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <label className="text-sm font-semibold text-gray-600 mb-2 block">
//                   Suggested Tags
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                   {analysisResult.tags.map((tag) => (
//                     <span
//                       key={tag}
//                       className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm"
//                     >
//                       {tag}
//                     </span>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             <div className="flex justify-end gap-4 mt-10">
//               <button
//                 onClick={() =>
//                   setModalState((prev) => ({
//                     ...prev,
//                     showConfirmUpload: false,
//                   }))
//                 }
//                 className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleFinalUpload}
//                 className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
//               >
//                 Upload File
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Delete Modal */}
//       {modalState.showDelete && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
//           <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
//             <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
//             <p className="text-gray-600 mb-6">
//               Are you sure you want to delete <strong>{fileToDelete}</strong>?
//             </p>
//             <div className="flex justify-end gap-4">
//               <button
//                 onClick={() =>
//                   setModalState((prev) => ({ ...prev, showDelete: false }))
//                 }
//                 className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={confirmDelete}
//                 className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
//               >
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Rename Modal */}
//       {modalState.showRename && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
//           <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
//             <h3 className="text-xl font-semibold mb-4">Rename File</h3>
//             <p className="text-gray-600 mb-4">
//               Enter a new name for <strong>{fileToRename?.oldName}</strong>
//             </p>
//             <div className="flex items-center gap-2 mt-4">
//               <input
//                 type="text"
//                 value={newFileName}
//                 onChange={(e) => setNewFileName(e.target.value)}
//                 className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
//                 placeholder="New file name"
//               />
//               <span className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md">
//                 .{fileToRename?.extension}
//               </span>
//             </div>
//             <div className="flex justify-end gap-4 mt-6">
//               <button
//                 onClick={() =>
//                   setModalState((prev) => ({ ...prev, showRename: false }))
//                 }
//                 className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={confirmRename}
//                 className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center justify-center w-[130px] disabled:bg-purple-400"
//                 disabled={isProcessing.renaming}
//               >
//                 {isProcessing.renaming ? (
//                   <FiLoader className="animate-spin" />
//                 ) : (
//                   "Save Changes"
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <main className="container mx-auto max-w-5xl px-4 py-8">
//         <header className="flex items-center gap-3 mb-10">
//           <svg
//             width="36"
//             height="36"
//             viewBox="0 0 24 24"
//             fill="none"
//             xmlns="http://www.w3.org/2000/svg"
//           >
//             <path
//               d="M12.4588 2.34375C12.1883 2.07328 11.8117 2.07328 11.5412 2.34375L3.34375 10.5412C3.12036 10.7646 3 11.0739 3 11.3958V20.25C3 20.6642 3.33579 21 3.75 21H20.25C20.6642 21 21 20.6642 21 20.25V11.3958C21 11.0739 20.8796 10.7646 20.6562 10.5412L12.4588 2.34375Z"
//               stroke="#8B5CF6"
//               strokeWidth="1.5"
//             />
//             <path
//               d="M15.75 12.75C15.75 14.8211 14.0711 16.5 12 16.5C9.92893 16.5 8.25 14.8211 8.25 12.75C8.25 10.6789 9.92893 9 12 9C14.0711 9 15.75 10.6789 15.75 12.75Z"
//               stroke="#8B5CF6"
//               strokeWidth="1.5"
//             />
//           </svg>
//           <h1 className="text-3xl font-bold text-gray-800">FileDrop</h1>
//         </header>

//         <div
//           {...getRootProps()}
//           className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
//             isDragActive
//               ? "border-purple-600 bg-purple-50"
//               : "border-gray-300 hover:border-purple-400 hover:bg-gray-100"
//           }`}
//         >
//           <input {...getInputProps()} />
//           <FiUploadCloud className="mx-auto text-5xl text-purple-500 mb-4" />
//           <p className="text-xl font-semibold text-gray-700">
//             Drag & drop files here, or click to select
//           </p>
//           <p className="text-sm text-gray-500 mt-1">
//             AI will automatically generate a name, tags, and categories for you
//           </p>
//         </div>

//         <div className="mt-12">
//           <h2 className="text-2xl font-semibold mb-6">Your Files</h2>
//           <div className="space-y-4">
//             {files.length === 0 ? (
//               <p className="text-gray-500 text-center py-4">
//                 You haven't uploaded any files yet.
//               </p>
//             ) : (
//               files.map((file) => (
//                 <div
//                   key={file.name}
//                   className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between transition-shadow hover:shadow-md"
//                 >
//                   <div className="flex items-center gap-4 overflow-hidden">
//                     <div className="text-3xl">{getFileIcon(file.name)}</div>
//                     <div className="truncate">
//                       <p className="font-semibold text-gray-800 truncate">
//                         {file.name}
//                       </p>
//                       <p className="text-sm text-gray-500">Documents</p>
//                     </div>
//                   </div>

//                   <div className="flex items-center gap-4 flex-shrink-0">
//                     {/* ✨ Dynamically render tags from the database ✨ */}
//                     <div className="hidden md:flex items-center gap-2 flex-wrap w-64">
//                       {file.tags && file.tags.length > 0 ? (
//                         file.tags.slice(0, 3).map((tag) => (
//                           <span
//                             key={tag}
//                             className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium"
//                           >
//                             #{tag.replace(/\s+/g, "-")}
//                           </span>
//                         ))
//                       ) : (
//                         <span className="text-xs text-gray-400 italic">
//                           No tags
//                         </span>
//                       )}
//                     </div>
//                     <p className="text-sm text-gray-600 w-24 text-right">
//                       {formatBytes(file.size)}
//                     </p>
//                     <p className="hidden lg:block text-sm text-gray-600 w-36 text-right">
//                       {formatDate(file.created_at)}
//                     </p>

//                     <div className="flex items-center gap-2 text-xl text-gray-500">
//                       <a
//                         href={file.url}
//                         download
//                         target="_blank"
//                         rel="noreferrer"
//                         className="hover:text-purple-600 p-2 rounded-full hover:bg-gray-100"
//                         title="Download"
//                       >
//                         <FiDownload />
//                       </a>
//                       <button
//                         onClick={() => handleRenameClick(file.name)}
//                         className="hover:text-purple-600 p-2 rounded-full hover:bg-gray-100"
//                         title="Rename"
//                       >
//                         <FiEdit />
//                       </button>
//                       <button
//                         onClick={() => handleShare(file.url)}
//                         className="hover:text-purple-600 p-2 rounded-full hover:bg-gray-100"
//                         title="Share"
//                       >
//                         <FiShare2 />
//                       </button>
//                       <button
//                         onClick={() => handleDeleteClick(file.name)}
//                         className="hover:text-red-600 p-2 rounded-full hover:bg-gray-100"
//                         title="Delete"
//                       >
//                         <FiTrash2 />
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import {
  FiFileText,
  FiUploadCloud,
  FiDownload,
  FiShare2,
  FiTrash2,
  FiLoader,
  FiEdit,
  FiX,
  FiFolder,
  FiClock,
} from "react-icons/fi";
import { FaFilePdf, FaFileWord, FaFileImage } from "react-icons/fa";

// --- API Configuration ---
const API_BASE = "http://localhost:3000";

// --- Helper Functions ---
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getFileIcon = (fileName) => {
  if (!fileName) return <FiFileText className="text-slate-400" />;
  const extension = fileName.split(".").pop().toLowerCase();
  if (extension === "pdf") return <FaFilePdf className="text-red-500" />;
  if (extension === "docx") return <FaFileWord className="text-blue-500" />;
  if (["jpg", "jpeg", "png"].includes(extension)) {
    return <FaFileImage className="text-emerald-500" />;
  }
  return <FiFileText className="text-slate-400" />;
};

// --- Main App Component ---
export default function App() {
  const [files, setFiles] = useState([]);

  // Consolidated State Management
  const [modalState, setModalState] = useState({
    showDelete: false,
    showRename: false,
    showConfirmUpload: false,
  });
  const [isProcessing, setIsProcessing] = useState({
    analyzing: false,
    uploading: false,
    renaming: false,
  });

  // State for specific actions
  const [fileToDelete, setFileToDelete] = useState(null);
  const [fileToRename, setFileToRename] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editedFilename, setEditedFilename] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/files`);
      setFiles(res.data);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Could not fetch files.");
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // --- AI Analysis and Upload Flow ---
  const handleFileAnalysis = async (file) => {
    setFileToUpload(file);
    setIsProcessing((prev) => ({ ...prev, analyzing: true }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/analyze-file`, formData);
      setAnalysisResult(res.data);
      setEditedFilename(res.data.descriptiveFilename);
      setModalState((prev) => ({ ...prev, showConfirmUpload: true }));
    } catch (error) {
      toast.error("AI analysis failed. Please try again.");
      console.error("Analysis error:", error);
    } finally {
      setIsProcessing((prev) => ({ ...prev, analyzing: false }));
    }
  };

  const handleFinalUpload = async () => {
    if (!fileToUpload || !analysisResult) return;

    const finalFilename = `${editedFilename}.${analysisResult.extension}`;

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("descriptiveFilename", finalFilename);
    formData.append("tags", JSON.stringify(analysisResult.tags));
    formData.append("categories", JSON.stringify(analysisResult.categories));

    setIsProcessing((prev) => ({ ...prev, uploading: true }));
    const uploadToast = toast.loading("Uploading your file...");

    try {
      await axios.post(`${API_BASE}/upload`, formData);
      toast.success("File uploaded successfully!", { id: uploadToast });
      fetchFiles();
      setModalState((prev) => ({ ...prev, showConfirmUpload: false }));
    } catch (error) {
      const errorMessage = error.response?.data?.error || "File upload failed.";
      toast.error(errorMessage, { id: uploadToast });
    } finally {
      setIsProcessing((prev) => ({ ...prev, uploading: false }));
      setFileToUpload(null);
      setAnalysisResult(null);
      setEditedFilename("");
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      handleFileAnalysis(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "application/pdf": [],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    onDropRejected: (fileRejections) => {
      const file = fileRejections[0].file;
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`File is too large: ${fileSizeMB} MB. Max allowed is 5 MB.`);
    },
  });

  // --- Standard File Actions ---
  const handleDeleteClick = (fileName) => {
    setFileToDelete(fileName);
    setModalState((prev) => ({ ...prev, showDelete: true }));
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      await axios.delete(`${API_BASE}/files/${fileToDelete}`);
      toast.success("File deleted successfully!");
      fetchFiles();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete the file.");
    } finally {
      setModalState((prev) => ({ ...prev, showDelete: false }));
      setFileToDelete(null);
    }
  };

  const handleRenameClick = (fileName) => {
    const nameParts = fileName.split(".");
    const extension = nameParts.pop();
    const baseName = nameParts.join(".");
    setFileToRename({ oldName: fileName, extension });
    setNewFileName(baseName);
    setModalState((prev) => ({ ...prev, showRename: true }));
  };

  const confirmRename = async () => {
    if (!fileToRename || !newFileName.trim()) {
      return toast.error("New file name cannot be empty.");
    }

    const finalNewName = `${newFileName.trim()}.${fileToRename.extension}`;

    setIsProcessing((prev) => ({ ...prev, renaming: true }));
    try {
      await axios.put(`${API_BASE}/files/${fileToRename.oldName}`, {
        newName: finalNewName,
      });
      toast.success("File renamed successfully!");
      fetchFiles();
      setModalState((prev) => ({ ...prev, showRename: false }));
    } catch (error) {
      console.error("Rename error:", error);
      toast.error("Failed to rename the file.");
    } finally {
      setIsProcessing((prev) => ({ ...prev, renaming: false }));
      setFileToRename(null);
      setNewFileName("");
    }
  };

  const handleShare = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "500",
          },
          success: {
            iconTheme: { primary: "#8b5cf6", secondary: "white" },
            duration: 3000,
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "white" },
            duration: 4000,
          },
        }}
      />

      {/* Processing Overlay */}
      {(isProcessing.analyzing || isProcessing.uploading) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-purple-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
              <FiLoader className="absolute inset-0 m-auto text-purple-600 text-2xl animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {isProcessing.analyzing ? "Analyzing File" : "Uploading File"}
            </h3>
            <p className="text-slate-600 text-sm">
              {isProcessing.analyzing
                ? "AI is processing your file..."
                : "Please wait while we upload your file..."}
            </p>
          </div>
        </div>
      )}

      {/* AI Upload Confirmation Modal */}
      {modalState.showConfirmUpload && analysisResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-slate-100 px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">
                Confirm Upload
              </h2>
              <button
                onClick={() =>
                  setModalState((prev) => ({
                    ...prev,
                    showConfirmUpload: false,
                  }))
                }
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="px-8 py-6">
              {/* File Preview */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 mb-8 border border-purple-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center text-2xl">
                    {getFileIcon(fileToUpload.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                      {fileToUpload.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatBytes(fileToUpload.size)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Filename Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Descriptive Filename
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100 transition-all">
                    <input
                      type="text"
                      value={editedFilename}
                      onChange={(e) => setEditedFilename(e.target.value)}
                      className="flex-1 px-4 py-3 outline-none text-slate-800 placeholder-slate-400"
                      placeholder="Enter descriptive filename"
                    />
                    <span className="bg-slate-50 text-slate-600 px-4 py-3 border-l border-slate-200 font-mono text-sm">
                      .{analysisResult.extension}
                    </span>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    AI-Suggested Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        <FiFolder className="w-3 h-3 mr-1.5" />
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    AI-Generated Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 rounded-b-2xl px-8 py-6 border-t border-slate-100">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() =>
                    setModalState((prev) => ({
                      ...prev,
                      showConfirmUpload: false,
                    }))
                  }
                  className="px-6 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalUpload}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40"
                >
                  Upload File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modalState.showDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <FiTrash2 className="text-red-600 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              Delete File
            </h3>
            <p className="text-slate-600 text-center mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-800">
                {fileToDelete}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModalState((prev) => ({ ...prev, showDelete: false }))
                }
                className="flex-1 px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {modalState.showRename && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <FiEdit className="text-purple-600 text-xl" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              Rename File
            </h3>
            <p className="text-slate-600 text-center mb-6">
              Enter a new name for{" "}
              <span className="font-semibold text-slate-800">
                {fileToRename?.oldName}
              </span>
            </p>
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100 transition-all mb-6">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="flex-1 px-4 py-3 outline-none text-slate-800 placeholder-slate-400"
                placeholder="New file name"
              />
              <span className="bg-slate-50 text-slate-600 px-4 py-3 border-l border-slate-200 font-mono text-sm">
                .{fileToRename?.extension}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setModalState((prev) => ({ ...prev, showRename: false }))
                }
                className="flex-1 px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRename}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center disabled:bg-purple-400"
                disabled={isProcessing.renaming}
              >
                {isProcessing.renaming ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.4588 2.34375C12.1883 2.07328 11.8117 2.07328 11.5412 2.34375L3.34375 10.5412C3.12036 10.7646 3 11.0739 3 11.3958V20.25C3 20.6642 3.33579 21 3.75 21H20.25C20.6642 21 21 20.6642 21 20.25V11.3958C21 11.0739 20.8796 10.7646 20.6562 10.5412L12.4588 2.34375Z"
                  stroke="white"
                  strokeWidth="1.5"
                />
                <path
                  d="M15.75 12.75C15.75 14.8211 14.0711 16.5 12 16.5C9.92893 16.5 8.25 14.8211 8.25 12.75C8.25 10.6789 9.92893 9 12 9C14.0711 9 15.75 10.6789 15.75 12.75Z"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 bg-clip-text text-transparent">
              FileDrop
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Intelligent file management with AI-powered organization. Upload,
            organize, and manage your files effortlessly.
          </p>
        </header>

        {/* Upload Zone */}
        <div className="mb-16">
          <div
            {...getRootProps()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
              isDragActive
                ? "border-purple-500 bg-purple-50/50 scale-[1.02]"
                : "border-slate-300 hover:border-purple-400 hover:bg-slate-50/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="px-8 py-16 text-center">
              <div
                className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDragActive
                    ? "bg-purple-100 scale-110"
                    : "bg-slate-100 hover:bg-purple-50"
                }`}
              >
                <FiUploadCloud
                  className={`text-3xl transition-colors duration-300 ${
                    isDragActive ? "text-purple-600" : "text-slate-400"
                  }`}
                />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {isDragActive ? "Drop your file here" : "Upload your files"}
              </h3>
              <p className="text-slate-600 mb-4">
                Drag and drop files here, or click to browse
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <span>Supported formats: PDF, DOCX, JPG, PNG</span>
                <span>•</span>
                <span>Max size: 5MB</span>
              </div>
              <div className="mt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  AI-powered organization
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                Your Files
              </h2>
              <p className="text-slate-600">{files.length} files uploaded</p>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
                <FiFolder className="text-2xl text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">
                No files yet
              </h3>
              <p className="text-slate-600">
                Upload your first file to get started with AI-powered
                organization.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 hover:border-purple-200 p-6"
                >
                  <div className="flex items-center gap-6">
                    {/* File Icon */}
                    <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-2xl flex-shrink-0">
                      {getFileIcon(file.name)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate text-lg mb-1">
                        {file.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <FiFolder className="w-4 h-4" />
                          Documents
                        </span>
                        <span>{formatBytes(file.size)}</span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          {formatDate(file.created_at)}
                        </span>
                      </div>

                      {/* Tags */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {file.tags && file.tags.length > 0 ? (
                          file.tags.slice(0, 4).map((tag, index) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              #{tag.replace(/\s+/g, "-")}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No tags
                          </span>
                        )}
                        {file.tags && file.tags.length > 4 && (
                          <span className="text-xs text-slate-500">
                            +{file.tags.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={file.url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="Download"
                      >
                        <FiDownload className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleRenameClick(file.name)}
                        className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="Rename"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleShare(file.url)}
                        className="p-2.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        title="Share"
                      >
                        <FiShare2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(file.name)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-12 border-t border-slate-200">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-slate-500 mb-4">
              <span>Powered by</span>
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Intelligence
              </div>
            </div>
            <p className="text-slate-600 max-w-md mx-auto">
              Automatically organize and categorize your files with smart AI
              analysis and intuitive management tools.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

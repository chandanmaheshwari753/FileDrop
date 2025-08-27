import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
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
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import { FaFilePdf, FaFileWord, FaFileImage } from "react-icons/fa";
import { supabase } from "../supabase";

// --- API Configuration ---
const API_BASE = process.env.REACT_APP_API_BASE;

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

// --- Main FileManager Component ---
export default function FileManager({ user, onLogout }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const isLoggedOutRef = useRef(false);

  // Upload and modal states
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

  // Get auth token for API requests
  const getAuthToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  // Create axios instance with auth interceptor
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: API_BASE,
    });

    client.interceptors.request.use(async (config) => {
      // Don't add auth token if user is logged out
      if (isLoggedOutRef.current) {
        // Cancel the request if user is logged out
        const cancelError = new Error("Request cancelled - user logged out");
        cancelError.name = "CancelledError";
        throw cancelError;
      }

      const token = await getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return client;
  }, []); // Empty dependency array since we don't want this to recreate

  const fetchFiles = useCallback(async () => {
    // Prevent fetching if user is not present or if logged out
    if (!user || isLoggedOutRef.current) return;

    try {
      const res = await apiClient.get("/files");
      // Double check if still logged in before setting files
      if (!isLoggedOutRef.current) {
        setFiles(res.data);
      }
    } catch (error) {
      // Don't log or show errors if request was cancelled due to logout
      if (error.name === "CancelledError") {
        return;
      }

      console.error("Error fetching files:", error);
      // Only show toast if we're still logged in
      if (!isLoggedOutRef.current) {
        toast.error("Could not fetch files.");
      }
    }
  }, [user]); // Remove apiClient from dependencies to prevent recreation

  useEffect(() => {
    if (user && !isLoggedOutRef.current) {
      fetchFiles();
    }
  }, [fetchFiles, user]);

  // Reset logout flag when user logs in
  useEffect(() => {
    if (user) {
      isLoggedOutRef.current = false;
    }
  }, [user]);

  // --- AI Analysis and Upload Flow ---
  const handleFileAnalysis = async (file) => {
    if (!user || isLoggedOutRef.current) return;

    setFileToUpload(file);
    setIsProcessing((prev) => ({ ...prev, analyzing: true }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiClient.post("/analyze-file", formData);
      if (!isLoggedOutRef.current) {
        setAnalysisResult(res.data);
        setEditedFilename(res.data.descriptiveFilename);
        setModalState((prev) => ({ ...prev, showConfirmUpload: true }));
      }
    } catch (error) {
      if (error.name === "CancelledError") return;

      if (!isLoggedOutRef.current) {
        toast.error("AI analysis failed. Please try again.");
        console.error("Analysis error:", error);
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, analyzing: false }));
    }
  };

  const handleFinalUpload = async () => {
    if (!fileToUpload || !analysisResult || isLoggedOutRef.current) return;

    const finalFilename = `${editedFilename}.${analysisResult.extension}`;

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("descriptiveFilename", finalFilename);
    formData.append("tags", JSON.stringify(analysisResult.tags));
    formData.append("categories", JSON.stringify(analysisResult.categories));

    setIsProcessing((prev) => ({ ...prev, uploading: true }));
    const uploadToast = toast.loading("Uploading your file...");

    try {
      await apiClient.post("/upload", formData);
      if (!isLoggedOutRef.current) {
        toast.success("File uploaded successfully!", { id: uploadToast });
        fetchFiles();
        setModalState((prev) => ({ ...prev, showConfirmUpload: false }));
      }
    } catch (error) {
      if (error.name === "CancelledError") {
        toast.dismiss(uploadToast);
        return;
      }

      if (!isLoggedOutRef.current) {
        const errorMessage =
          error.response?.data?.error || "File upload failed.";
        toast.error(errorMessage, { id: uploadToast });
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, uploading: false }));
      setFileToUpload(null);
      setAnalysisResult(null);
      setEditedFilename("");
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0 && !isLoggedOutRef.current) {
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
      if (!isLoggedOutRef.current) {
        const file = fileRejections[0].file;
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(
          `File is too large: ${fileSizeMB} MB. Max allowed is 5 MB.`
        );
      }
    },
  });

  // --- File Actions ---
  const handleDeleteClick = (fileName) => {
    if (isLoggedOutRef.current) return;
    setFileToDelete(fileName);
    setModalState((prev) => ({ ...prev, showDelete: true }));
  };

  const confirmDelete = async () => {
    if (!fileToDelete || isLoggedOutRef.current) return;
    try {
      await apiClient.delete(`/files/${fileToDelete}`);
      if (!isLoggedOutRef.current) {
        toast.success("File deleted successfully!");
        fetchFiles();
      }
    } catch (error) {
      if (error.name === "CancelledError") return;

      console.error("Delete error:", error);
      if (!isLoggedOutRef.current) {
        toast.error("Failed to delete the file.");
      }
    } finally {
      setModalState((prev) => ({ ...prev, showDelete: false }));
      setFileToDelete(null);
    }
  };

  const handleRenameClick = (fileName) => {
    if (isLoggedOutRef.current) return;
    const nameParts = fileName.split(".");
    const extension = nameParts.pop();
    const baseName = nameParts.join(".");
    setFileToRename({ oldName: fileName, extension });
    setNewFileName(baseName);
    setModalState((prev) => ({ ...prev, showRename: true }));
  };

  const confirmRename = async () => {
    if (!fileToRename || !newFileName.trim() || isLoggedOutRef.current) {
      if (!isLoggedOutRef.current) {
        return toast.error("New file name cannot be empty.");
      }
      return;
    }

    const finalNewName = `${newFileName.trim()}.${fileToRename.extension}`;

    setIsProcessing((prev) => ({ ...prev, renaming: true }));
    try {
      await apiClient.put(`/files/${fileToRename.oldName}`, {
        newName: finalNewName,
      });
      if (!isLoggedOutRef.current) {
        toast.success("File renamed successfully!");
        fetchFiles();
        setModalState((prev) => ({ ...prev, showRename: false }));
      }
    } catch (error) {
      if (error.name === "CancelledError") return;

      console.error("Rename error:", error);
      if (!isLoggedOutRef.current) {
        toast.error("Failed to rename the file.");
      }
    } finally {
      setIsProcessing((prev) => ({ ...prev, renaming: false }));
      setFileToRename(null);
      setNewFileName("");
    }
  };

  const handleLogout = async () => {
    try {
      // Set the logout flag immediately
      isLoggedOutRef.current = true;

      // Clear files immediately to prevent any race conditions
      setFiles([]);

      // Clear any ongoing operations
      setModalState({
        showDelete: false,
        showRename: false,
        showConfirmUpload: false,
      });
      setIsProcessing({
        analyzing: false,
        uploading: false,
        renaming: false,
      });

      // Clear any temp state
      setFileToDelete(null);
      setFileToRename(null);
      setNewFileName("");
      setFileToUpload(null);
      setAnalysisResult(null);
      setEditedFilename("");

      // Perform logout
      await supabase.auth.signOut();
      onLogout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100">
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
        {/* Header with User Info */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-between mb-8">
            <div></div>
            <div className="inline-flex items-center gap-3">
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <FiUser className="text-purple-600 text-sm" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-800">
                    {user?.user_metadata?.name || user?.email}
                  </p>
                  <p className="text-slate-500 text-xs">Signed in</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-white rounded-lg transition-all"
                title="Sign out"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
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
                        onClick={() => {
                          if (!isLoggedOutRef.current) {
                            navigator.clipboard.writeText(file.url);
                            toast.success("Link copied to clipboard!");
                          }
                        }}
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

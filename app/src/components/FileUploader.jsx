import { useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FaPaperclip, FaSpinner } from "react-icons/fa";

const url = import.meta.env.VITE_URL || "http://localhost:5000";

const FileUploader = ({ onSend, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File too large (max 50MB)");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${url}/api/auth/upload-file`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      onSend(response.data.fileUrl, response.data.fileType, response.data.originalName);
      toast.success("File ready to send");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className={`rounded-full p-2 transition hover:scale-105 ${
          uploading
            ? "cursor-not-allowed bg-stone-400 text-white"
            : "bg-stone-200 text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-white dark:hover:bg-stone-600"
        } disabled:opacity-50`}
        title="Attach file"
        aria-label="Attach file"
      >
        {uploading ? <FaSpinner className="animate-spin" size={16} /> : <FaPaperclip size={16} />}
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*,text/plain,audio/*"
        className="hidden"
      />
    </div>
  );
};

export default FileUploader;

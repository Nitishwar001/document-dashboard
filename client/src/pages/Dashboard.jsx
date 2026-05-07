import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import socket from "../services/socket";
import { useDropzone } from "react-dropzone";

function Dashboard() {

  const [uploads, setUploads] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  /* Fetch Documents */
  const fetchDocuments = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/documents"
      );

      setDocuments(res.data);

    } catch (error) {
      console.log(error);
    }

  };

  /* Fetch Notifications */
  const fetchNotifications = async () => {

    try {

      const res = await axios.get(
        "http://localhost:5000/notifications"
      );

      setNotifications(res.data);

    } catch (error) {
      console.log(error);
    }

  };

  /* Handle Upload */
  const handleUpload = async (e) => {

    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    /* Validate PDFs */
    const invalidFiles = files.filter(
      (file) => file.type !== "application/pdf"
    );

    if (invalidFiles.length > 0) {

      toast.error("Only PDF files are allowed");

      return;

    }

    /* Bulk Upload Toast */
    if (files.length > 3) {

      toast.loading(
        `Upload in progress — processing ${files.length} files in background`,
        {
          id: "bulk-upload",
        }
      );

    }

    /* Upload State */
    const uploadItems = files.map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));

    setUploads(uploadItems);

    /* Upload Files */
    files.forEach(async (file, index) => {

      const formData = new FormData();

      formData.append("files", file);

      try {

        await axios.post(
          "http://localhost:5000/upload",
          formData,
          {

            onUploadProgress: (progressEvent) => {

              const percent = Math.round(
                (progressEvent.loaded * 100) /
                progressEvent.total
              );

              setUploads((prev) => {

                const updated = [...prev];

                updated[index].progress = percent;
                updated[index].status = "uploading";

                if (percent === 100) {
                  updated[index].status = "complete";
                }

                return updated;
              });

            },

          }
        );

        fetchDocuments();
        fetchNotifications();

        /* Bulk Upload Success */
        if (files.length > 3) {

          toast.success(
            `${files.length} files uploaded successfully`,
            {
              id: "bulk-upload",
            }
          );

        }

      } catch (error) {

        setUploads((prev) => {

          const updated = [...prev];

          updated[index].status = "failed";

          return updated;
        });

        toast.error(`${file.name} upload failed`);

      }

    });

  };

  /* Drag & Drop Upload */
  const onDrop = (acceptedFiles) => {

    const event = {
      target: {
        files: acceptedFiles,
      },
    };

    handleUpload(event);

  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({

    onDrop,

    accept: {
      "application/pdf": [".pdf"],
    },

  });

  /* Mark All Read */
  const markAllRead = async () => {

    try {

      await axios.patch(
        "http://localhost:5000/notifications/read-all"
      );

      fetchNotifications();

    } catch (error) {
      console.log(error);
    }

  };
/* Delete Document */
const deleteDocument = async (filename) => {

  try {

    await axios.delete(
      `http://localhost:5000/documents/${filename}`
    );

    toast.success("Document deleted");

    fetchDocuments();
    fetchNotifications();

  } catch (error) {

    toast.error("Delete failed");

  }

};
  /* Initial Load */
  useEffect(() => {

    fetchDocuments();
    fetchNotifications();

    /* Socket Listener */
    socket.on("upload-complete", (data) => {

      toast.success(data.message);

      fetchDocuments();
      fetchNotifications();

    });

    return () => {
      socket.off("upload-complete");
    };

  }, []);

  return (

    <div className="min-h-screen bg-[#f5f7fb]">

      {/* Header */}
      <header className="bg-white shadow-sm px-8 py-4 flex items-center justify-between relative">

        <h1 className="text-3xl font-bold text-blue-600">
          Document Dashboard
        </h1>

        {/* Notification Bell */}
        <button
          onClick={() =>
            setShowNotifications(
              !showNotifications
            )
          }
          className="relative text-2xl"
        >

          🔔

          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2">

            {
              notifications.filter(
                (n) => !n.read
              ).length
            }

          </span>

        </button>

        {/* Notifications */}
        {showNotifications && (

          <div className="absolute top-16 right-8 w-96 bg-white rounded-2xl shadow-xl border p-4 z-50">

            <div className="flex items-center justify-between mb-4">

              <h2 className="text-lg font-semibold">
                Notifications
              </h2>

              <button
                onClick={markAllRead}
                className="text-blue-600 text-sm"
              >
                Mark All Read
              </button>

            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">

              {notifications.length === 0 && (

                <p className="text-gray-500 text-sm">
                  No notifications
                </p>

              )}

              {notifications.map(
                (notification, index) => (

                  <div
                    key={index}
                    className={`p-3 rounded-xl border ${
                      notification.read
                        ? "bg-gray-50"
                        : "bg-blue-50"
                    }`}
                  >

                    <p className="font-medium text-sm">
                      {notification.message}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">

                      {new Date(
                        notification.timestamp
                      ).toLocaleString()}

                    </p>

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </header>

      {/* Main */}
      <main className="p-8">

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-md p-8">

          <h2 className="text-2xl font-semibold mb-6">
            Upload Documents
          </h2>

          {/* Drag & Drop Upload */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-blue-600 bg-blue-50"
                : "border-blue-300"
            }`}
          >

            <input {...getInputProps()} />

            <p className="text-gray-600 text-lg font-medium">

              {isDragActive
                ? "Drop PDF files here..."
                : "Drag & Drop PDF files here"}

            </p>

            <p className="text-sm text-gray-400 mt-2">
              or click to browse files
            </p>

          </div>

          {/* Upload Progress */}
          <div className="mt-8 space-y-4">

            {uploads.map((upload, index) => (

              <div
                key={index}
                className="bg-gray-50 border rounded-xl p-4"
              >

                <div className="flex justify-between mb-2">

                  <div>

                    <p className="font-medium">
                      {upload.file.name}
                    </p>

                    <p className="text-sm text-gray-500">

                      {(upload.file.size / 1024 / 1024)
                        .toFixed(2)} MB

                    </p>

                  </div>

                  <span className={`text-sm font-medium ${
                    upload.status === "complete"
                      ? "text-green-600"
                      : upload.status === "failed"
                      ? "text-red-500"
                      : "text-blue-600"
                  }`}>

                    {upload.status}

                  </span>

                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">

                  <div
                    className={`h-3 rounded-full transition-all ${
                      upload.status === "failed"
                        ? "bg-red-500"
                        : "bg-blue-600"
                    }`}
                    style={{
                      width: `${upload.progress}%`,
                    }}
                  />

                </div>

                <p className="text-right text-sm mt-1">
                  {upload.progress}%
                </p>

              </div>

            ))}

          </div>

        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-2xl shadow-md p-8 mt-8 overflow-x-auto">

          <h2 className="text-2xl font-semibold mb-6">
            Uploaded Documents
          </h2>

          <table className="w-full min-w-[700px]">

            <thead>

              <tr className="border-b text-left">

                <th className="pb-3">Name</th>
                <th>Size</th>
                <th>Date</th>
                <th>Type</th>
                <th>Download</th>
                <th>Delete</th>

              </tr>

            </thead>

            <tbody>

              {documents.map((doc, index) => (

                <tr
                  key={index}
                  className="border-b"
                >

                  <td className="py-4">
                    {doc.originalName}
                  </td>

                  <td>

                    {(doc.size / 1024 / 1024)
                      .toFixed(2)} MB

                  </td>

                  <td>

                    {new Date(
                      doc.uploadDate
                    ).toLocaleString()}

                  </td>

                  <td>
                    {doc.type}
                  </td>

                  <td>

                    <a
                      href={`http://localhost:5000/download/${doc.name}`}
                      className="text-blue-600 hover:underline"
                    >
                      Download
                    </a>

                  </td>
                  <td>

  <button
    onClick={() =>
      deleteDocument(doc.name)
    }
    className="text-red-500 hover:underline"
  >
    Delete
  </button>

</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </main>

    </div>

  );
}

export default Dashboard;
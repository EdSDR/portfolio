"use client";

export default function DownloadResumeButton() {
  const handleClick = async () => {
    const response = await fetch("/api/file");
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "resume-edsdr.pdf");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);

    return response;
  };

  return (
    <main>
      <button
        type="button"
        onClick={handleClick}
        className="rounded-md bg-blue-950 px-8 py-4 text-white transition duration-500 hover:bg-blue-900"
      >
        Resume
      </button>
    </main>
  );
}

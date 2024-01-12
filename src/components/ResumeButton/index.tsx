"use client";

export default function ResumeButton() {
  const handleClick = async () => {
    const response = await fetch("/api/file");
    const url = window.URL.createObjectURL(await response.blob());
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "resume-edsdr-dev.pdf");
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
        className="rounded-md bg-blue-950 px-8 py-4 text-white transition duration-500 hover:bg-blue-900 dark:bg-blue-900"
      >
        Resume
      </button>
    </main>
  );
}

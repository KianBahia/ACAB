import { useState } from "react";
import LandingPage from "./LandingPage";

function App() {
  const [hasLaunched, setHasLaunched] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState("");

  if (!hasLaunched) {
    return <LandingPage onLaunch={() => setHasLaunched(true)} />;
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: API integration will go here
    console.log("Image:", image);
    console.log("Description:", description);
  };

  const handleRemoveImage = () => {
    setImage(null); 
    setImagePreview(null);
    // Reset file input
    const fileInput = document.getElementById("image-upload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#ff4201]">
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-center mb-8 text-5xl md:text-6xl font-black text-black tracking-tight drop-shadow-lg">
          ACAB
        </h1>
        <p className="text-center text-black/80 mb-12 text-lg md:text-xl font-medium">
          Upload an image and describe what you'd like to do with it
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label htmlFor="image-upload" className="cursor-pointer">
              <div className="border-4 border-dashed border-black/30 rounded-xl p-8 bg-black/20 backdrop-blur-sm transition-all duration-300 hover:border-black/50 hover:bg-black/30 min-h-[300px] md:min-h-[300px] flex items-center justify-center relative">
                {imagePreview ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-[500px] md:max-h-[500px] rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/80 text-white border-2 border-white text-2xl cursor-pointer flex items-center justify-center leading-none transition-all duration-200 hover:bg-red-600 hover:scale-110"
                      onClick={handleRemoveImage}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 text-black/70 text-center">
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-black"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p className="m-0 text-lg font-bold text-black">
                      Click to upload an image
                    </p>
                    <span className="text-sm text-black/60">
                      or drag and drop
                    </span>
                  </div>
                )}
              </div>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label
              htmlFor="description"
              className="font-bold text-base text-black"
            >
              Description / Prompt
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you'd like to do with this image..."
              className="w-full p-4 border-4 border-black/30 rounded-lg bg-black/20 backdrop-blur-sm text-black font-inherit text-base resize-y transition-all duration-300 focus:outline-none focus:border-black/50 focus:bg-black/30 placeholder:text-black/50 font-medium"
              rows="5"
            />
          </div>

          <button
            type="submit"
            className="px-8 py-4 text-lg font-bold text-white bg-black border-4 border-white rounded-lg cursor-pointer transition-all duration-300 mt-2 hover:scale-105 hover:bg-gray-900 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            disabled={!image || !description.trim()}
          >
            Process Image
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;

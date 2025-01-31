import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
// Get the current directory (equivalent to __dirname in CommonJS)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fetchPlaylistData = async (playlistId) => {
  try {
    // Fetch the playlist embed page HTML content
    const htmlContent = await fetch(
      `https://open.spotify.com/embed/playlist/${playlistId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((res) => res.text());

    // Regex to extract the JSON data from the <script> tag with id "__NEXT_DATA__"
    const regex =
      /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s;
    const match = htmlContent.match(regex);

    if (match) {
      // Parse the JSON data from the matched content
      const jsonData = JSON.parse(match[1]);

      // Check if the track list exists and contains items with audio previews
      if (jsonData?.props?.pageProps?.state?.data?.entity?.trackList) {
        // Filter tracks that have an audio preview
        return jsonData.props.pageProps.state.data.entity.trackList.filter(
          (item) => item.audioPreview != null
        );
      } else {
        console.log("No track list found or no audio preview available.");
        return [];
      }
    } else {
      console.log("No JSON data found in the page.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching playlist data:", error);
    return [];
  }
};

const downloadPreview = async (url, outputDir, fileName) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    // Save the audio file
    const filePath = path.join(outputDir, fileName);
    const stream = fs.createWriteStream(filePath);
    response.body.pipe(stream);
    console.log(`Downloaded: ${fileName}`);
  } catch (error) {
    console.error(`Error downloading file: ${error.message}`);
  }
};

const savePlaylistPreviews = async (playlistId) => {
  // Fetch playlist data
  const tracks = await fetchPlaylistData(playlistId);
  // Sanitize the playlistId to remove invalid characters
  const sanitizedPlaylistId = playlistId.replace(/[^a-zA-Z0-9]/g, "_");

  if (tracks.length === 0) {
    console.log("No tracks with audio previews found.");
    return;
  }

  // Create the directory structure using the sanitized playlistId
  const baseDir = path.join(__dirname, "data", "rawData", sanitizedPlaylistId);
  fs.mkdirSync(baseDir, { recursive: true });

  // Download all audio previews
  for (const track of tracks) {
    const songName = track.title.replace(/[^a-z0-9]/gi, "_").toLowerCase(); // Sanitize filename
    const fileName = `${songName}.mp3`;
    const previewUrl = track.audioPreview.url;

    await downloadPreview(previewUrl, baseDir, fileName);
  }
};

// Example usage
const playlistId = "5pNNCxNEhl5tKxkI9kFAoW?si=10eaefc1ba7a4bb8";
savePlaylistPreviews(playlistId);

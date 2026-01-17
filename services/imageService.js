const axios = require("axios");

module.exports.getImage = async (query) => {
  try {
    const url = `https://api.unsplash.com/search/photos`;
    const { data } = await axios.get(url, {
      params: {
        query,
        per_page: 1,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (
      data.results &&
      data.results.length > 0 &&
      data.results[0].urls &&
      data.results[0].urls.small
    ) {
      return data.results[0].urls.small;
    } else {
      return null;
    }
  } catch (err) {
    console.error("Unsplash Error:", err.message);
    return null;
  }
};

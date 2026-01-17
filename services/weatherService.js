const axios = require("axios");

module.exports.getWeather = async (city) => {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${process.env.WEATHER_API_KEY}&units=metric`;

    const { data } = await axios.get(url);

    return {
      temp: `${data.main.temp}°C`,
      condition: data.weather[0].description,
      humidity: `${data.main.humidity}%`,
    };
  } catch (err) {
    if (err.response) {
      console.error(`Weather API Error for city "${city}":`, err.response.data);
    } else {
      console.error("Weather API Network Error:", err.message);
    }
    return null;
  }
};

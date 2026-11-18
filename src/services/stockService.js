export const fetchStockData = async () => {

  try {

    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwj12s8NfiDZRTwwKd2NsFLSWAEkj8Hrk9gAKS59gsFobNH8EkwRy28b2yQauJ487Tg/exec"
    );

    const data = await res.json();

    return data;

  } catch (err) {

    console.error("Stock fetch error:", err);
    return [];

  }

};

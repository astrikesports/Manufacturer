let districtCache = null;

export async function loadDistricts() {
  if (districtCache) return districtCache;

  const res = await fetch(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vS67KO9ZS8Dk5pNd6dWzmtXafD9AQb38xmd5fs1woHAPRewJBYfFgbaMzI3d-FsYOJ3bbL2sWt-oSxn/pub?gid=813343933&single=true&output=csv"
  );

  const text = await res.text();

  const rows = text.split("\n").slice(1);

  const data = rows.map(row => {
    const cols = row.split(",");

    return {
      party: cols[1]?.trim(),
      pincode: cols[2]?.trim(),
      district: cols[3]?.replace(/"/g, "").trim()
    };
  });

  districtCache = data;
  return data;
}

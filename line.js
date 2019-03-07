const loadData = // d3.json("https://cloud.iexapis.com/beta/stock/aapl/chart/3m?token=" + real_token)
  d3.json("https://sandbox.iexapis.com/beta/stock/aapl/chart/3m?token=Tsk_e12e7e8e71494d60a4d97764b433f866").then(data => {
    data.forEach((d) => {
      d["date"] = new Date(d["date"]);
    })
    return data;
  })

loadData.then(data => {
  initializeChart(data)
})

const movingAverage = (data, numberOfPricePoints) => {
  return data.map((row, index, total) => {
    const start = Math.max(0, index - numberOfPricePoints);
    const end = index;
    const subset = total.slice(start, end + 1);
    const sum = subset.reduce((a, b) => {
      return a + b["uClose"];
    }, 0);
    return {
      date: row["date"],
      average: sum / subset.length
    };
  });
};

const responsivefy = svg => {
  const container = d3.select(svg.node(). parentNode),
    width = parseInt(svg.style("width")),
    height = parseInt(svg.style("height")),
    aspect = width / height;

  const resize = () => {
    let targetWidth = parseInt(container.style("width"))
    svg.attr("width", targetWidth);
    svg.attr("height", Math.round(targetWidth / aspect))
  }

  svg.attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMinYMid")
    .call(resize)

  d3.select(window).on("resize." + container.attr("id"), resize)


};

const initializeChart = data => {
  console.log(data);
  // remove any objects that don't have adjusted high, low, open, or close
  data = data.filter(row => row["uHigh"] && row["uLow"] && row["uClose"] && row["uOpen"]);

  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom;

  const xMin = d3.min(data, d => d["date"]);
  const xMax = d3.max(data, d => d["date"]);
  const yMin = d3.min(data, d => d["uClose"]);
  const yMax = d3.max(data, d => d["uClose"]);

  const xScale = d3.scaleTime().domain([xMin, xMax]).range([0, width]);
  const yScale = d3.scaleLinear().domain([yMin - 5, yMax]).range([height, 0]);

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin["left"] + margin["right"])
    .attr("height", height + margin["top"] + margin["bottom"])
    // allow SVG element to have responsive capabilities by listening to window resize events
    .call(responsivefy)
    .append("g")
    .attr("transform", `translate(${margin["left"]}, ${margin["top"]})`);

  svg.append("g")
    .attr("id", "xAxis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  svg.append("g")
    .attr("id", "yAxis")
    .attr("transform", `translate(${width}, 0)`)
    .call(d3.axisRight(yScale));

  const line = d3.line()
    .x(d => xScale(d["date"]))
    .y(d => yScale(d["uClose"]));

  const movingAverageLine = d3.line()
    .x(d => xScale(d["date"]))
    .y(d => yScale(d["average"]))
    .curve(d3.curveBasis);

  console.log("LINE", line);

  svg.append("path")
    .data([data])
    .style("fill", "none")
    .attr("id", "priceChart")
    .attr("stroke", "steelblue")
    .attr("stroke-width", "1.5")
    .attr("d", line);

  const movingAverageData = movingAverage(data, data.length);

  svg.append("path")
    .data([movingAverageData])
    .style("fill", "none")
    .attr("id", "movingAverageLine")
    .attr("stroke", "#FF8900")
    .attr("d", movingAverageLine)

}

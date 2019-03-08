const loadData = d3.json("https://cloud.iexapis.com/beta/stock/aapl/chart/6m?token=sk_2ea88011fc4b4918b72bf4508b814d7d")
  // d3.json("https://sandbox.iexapis.com/beta/stock/aapl/chart/3m?token=Tsk_e12e7e8e71494d60a4d97764b433f866")
  .then(data => {
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

  // change second argument to determine how long of an average to use ie: 8 days
  const movingAverageData = movingAverage(data, 8);

  svg.append("path")
    .data([movingAverageData])
    .style("fill", "none")
    .attr("id", "movingAverageLine")
    .attr("stroke", "#FF8900")
    .attr("d", movingAverageLine);

  const volData = data.filter(d => d["uVolume"] !== null && d["uVolume"] !== 0);

  const yMinVolume = d3.min(volData, d => Math.min(d["uVolume"]));

  const yMaxVolume = d3.max(volData, d => Math.max(d["uVolume"]));

  const yVolumeScale = d3.scaleLinear()
    .domain([yMinVolume, yMaxVolume])
    .range([height, yScale(yMin) + 5])
    console.log(yMin);

    svg.selectAll()
      .data(volData)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d["date"]))
      .attr("y", d => yVolumeScale(d["uVolume"]))
      .attr("fill", (d, i) => {
        if (i === 0) {
          return "#03a678";
        } else {
          return volData[i - 1]["uClose"] > d["uClose"] ? "#c0392b" : "#03a678";
        }
      })
      .attr("width", 1)
      .attr("height", d => height - yVolumeScale(d["uVolume"]));

    const focus = svg.append("g")
      .attr("class", "focus")
      .style("display", "none");

    focus.append("circle")
      .attr("r", 4.5);

    focus.append("line")
      .classed("x", true);

    focus.append("line")
      .classed("y", true);

    svg.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => focus.style("display", "none"))
      .on("mousemove", generateCrosshair);

    d3.select(".overlay")
      .style("fill", "none");
    d3.select(".overlay")
      .style("pointer-events", "all");

    d3.selectAll(".focus line")
      .style("fill", "none");
    d3.selectAll(".focus line")
      .style("stroke", "#67809f");
    d3.selectAll(".focus line")
      .style("stroe-width", "1.5px");
    d3.selectAll(".focus line")
      .style("stroke-dasharray", "3 3");

    const bisectDate = d3.bisector(d => d["date"]).left;

    function generateCrosshair() {
      const correspondingDate = xScale.invert(d3.mouse(this)[0]);
      const i = bisectDate(data, correspondingDate, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const currentPoint = correspondingDate - d0["date"] > d1["date"] - correspondingDate ? d1 : d0;

      focus.attr("transform", `translate(${xScale(currentPoint["date"])}, ${yScale(currentPoint["uClose"])})`);

    focus.select("line.x")
      .attr("x1", 0)
      .attr("x2", width - xScale(currentPoint["date"]))
      .attr("y1", 0)
      .attr("y2", 0);

    focus.select("line.y")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", 0)
      .attr("y2", height - yScale(currentPoint["uClose"]))

    updateLegends(currentPoint);
  }

  const updateLegends = currentData => {
    d3.selectAll(".lineLegend").remove();

    const legendKeys = Object.keys(data[0]);
    const lineLegend = svg
      .selectAll(".lineLegend")
      .data(legendKeys)
      .enter()
      .append("g")
      .attr("class", "lineLegend")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    lineLegend.append("text")
      .text( d => {
        if (d === "date") {
          return `${d}: ${currentData[d].toLocaleDateString()}`;
        } else if (
          d === "uHigh" || d == "uLow" || d === "uOpen" || d === "uClose"
        ) {
          return `${d}: ${currentData[d].toFixed(2)}`;
        }
        // else {
        //   return `${d}: ${currentData[d]}`;
        // }
      })
      .style("fill", "white")
      .attr("transform", "translate(15,9)")
  };



}

const loadData =
d3.json("https://cloud.iexapis.com/beta/stock/aapl/chart/6m?token=sk_2ea88011fc4b4918b72bf4508b814d7d")
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

  const margin = {top: 50, right: 50, bottom: 50, left: 50};
  const width = window.innerWidth - margin.left - margin.right;
  const height = window.innerHeight - margin.top - margin.bottom;

  const xMin = d3.min(data, d => d["date"]);
  const xMax = d3.max(data, d => d["date"]);
  const yMin = d3.min(data, d => d["uLow"]);
  const yMax = d3.max(data, d => d["uHigh"]);

  const xScale = d3.scaleTime().domain([xMin, xMax]).range([0, width]);
  const yScale = d3.scaleLinear().domain([yMin - 5, yMax]).range([height, 0]);

  const closeLine = d3.line()
    .x(d => xScale(d["date"]))
    .y(d => yScale(d["uClose"]));

  const openLine = d3.line()
    .x(d => xScale(d["date"]))
    .y(d => yScale(d["uOpen"]));

  const movingAverageLine = d3.line()
    .x(d => xScale(d["date"]))
    .y(d => yScale(d["average"]))
    .curve(d3.curveBasis);

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

  const sticks = svg.append("g")
    .attr("id", "sticks")
    .selectAll()
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d["date"]))
      .attr("y", (d) => yScale(d["uHigh"]))
      .attr("width", 1)
      .attr("height", (d) => (Math.abs(yScale(d["uHigh"]) - yScale(d["uLow"]))))
      .attr("fill", (d) => "green" )


  const bands = svg.append("g")
    .attr("id", "bands")
    .selectAll()
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => xScale(d["date"]))
      .attr("y", d => {
        if (d["uOpen"] > d["uClose"]) {
          return yScale(d["uOpen"]);
        } else {
          return yScale(d["uClose"])
        }
      })
      .attr("width", 1)
      .attr("height", d => (Math.abs(yScale(d["uClose"]) - yScale(d["uOpen"]))))
      .attr("stroke", d => {
        if (d["uOpen"] > d["uClose"]) {
          return "#ff6666";
        } else {
          return "#99ccff";
        }
      })
      .attr("stroke-width", (width / data.length) / 4)

  const closePath = svg.append("g")
    .attr("id", "close")
    .append("path")
    .data([data])
    .style("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", "1.5")
    .attr("d", closeLine);

  const openPath = svg.append("g")
    .attr("id", "open")
    // .attr("class", "hidden")
    .append("path")
    .data([data])
    .style("fill", "none")
    .attr("stroke", "yellow")
    .attr("stroke-width", "1.5")
    .attr("d", openLine);

  let movingAverageData = movingAverage(data, 8);

  const averagePath = svg.append("g")
    .attr("id", "movingAverageLine")
    .append("path")
    .data([movingAverageData])
    .style("fill", "none")
    .attr("stroke", "#FF8900")
    .attr("d", movingAverageLine);

  const avgBtns = d3.selectAll(".avg-btn")

  avgBtns.on("click", function() {
    let days
    if (this.id === "avgall") {
      days = data.length
    } else {
      days = parseInt((this.id.slice(3)))
    }

    movingAverageData = movingAverage(data, days);
    averagePath.data([movingAverageData])
      .transition()
      .duration(1000)
      .attr("d", movingAverageLine);
  })

  const openBtn = d3.select("#openPath");

  openBtn.on("click", function() {
    if (this.classList.contains("toggle-on")) {
      console.log(this);

      this.classList.remove("toggle-on");
      this.innerText = "Show Open";
      openPath
      .transition()
      .duration(500)
      // .attr("class", "hidden")
      .attr("stroke-width", "0");
    } else {
      console.log(this);

      this.classList.add("toggle-on");
      this.innerText = "Hide Open";
      openPath
      .transition()
      .duration(500)
      .attr("stroke-width", "1.5");
      // .attr("class", "notHidden")
    }
  })

  const closeBtn = d3.select("#closePath");

  closeBtn.on("click", function() {
    if (this.classList.contains("toggle-on")) {
      this.classList.remove("toggle-on");
      this.innerText = "Show Close"
      closePath
      .transition()
      .duration(500)
      .attr("stroke-width", "0")
    } else {
      this.classList.add("toggle-on");
      this.innerText = "Hide Close";
      closePath
      .transition()
      .duration(500)
      .attr("stroke-width", "1.5");
    }
  })

  const ohlcBtn = d3.select("#ohlcBtn");

  ohlcBtn.on("click", function() {
    if (this.classList.contains("toggle-on")) {
      console.log("HI");
      this.classList.remove("toggle-on");
      this.innerText = "Show OHLC"
      bands
      .transition()
      .duration(1500)
      .attr("width", "0")
      .attr("stroke-width", "0")

      sticks
      .transition()
      .duration(1500)
      .attr("width", "0")
    } else {
      this.classList.add("toggle-on");
      this.innerText = "Hide OHLC";
      bands
      .transition()
      .duration(1500)
      .attr("width", "1")
      .attr("stroke-width", (width / data.length) / 4);

      sticks
      .transition()
      .duration(1500)
      .attr("width", "1")
    }
  })

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

//   const updateLegends = currentData => {
//     d3.selectAll(".lineLegend").remove();
//
//     const legendKeys = Object.keys(data[0]);
//     const lineLegend = svg
//       .selectAll(".lineLegend")
//       .data(legendKeys)
//       .enter()
//       .append("g")
//       .attr("class", "lineLegend")
//       .attr("transform", (d, i) => `translate(0, ${i * 20})`);
//
//     lineLegend.append("text")
//       .text( d => {
//         if (d === "date") {
//           return `${d}: ${currentData[d].toLocaleDateString()}`;
//         } else if (
//           d === "uHigh" || d == "uLow" || d === "uOpen" || d === "uClose"
//         ) {
//           return `${d}: ${currentData[d].toFixed(2)}`;
//         }
//         // else {
//         //   return `${d}: ${currentData[d]}`;
//         // }
//       })
//       .style("fill", "white")
//       .attr("transform", "translate(15,9)")
//   };
//
// }

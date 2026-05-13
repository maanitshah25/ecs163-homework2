const tooltip = d3.select("#tooltip");

// Show tooltip near the cursor
function showTip(html, event) {
  tooltip.html(html)
    .style("opacity", 1)
    .style("left", (event.pageX + 14) + "px")
    .style("top",  (event.pageY - 10) + "px");
}

// Hide tooltip
function hideTip() { tooltip.style("opacity", 0); }

d3.csv("data/music_mental_health_survey_results.csv", d => {  //  Load CSV
  const hours      = +d["Hours per day"];
  const anxiety    = +d["Anxiety"];
  const depression = +d["Depression"];
  const genre      = d["Fav genre"]?.trim();
  const effect     = d["Music effects"]?.trim();

  // Drop rows with missing essential fields
  if (!genre || isNaN(hours) || isNaN(anxiety) || isNaN(depression)) return null;

  return { hours, anxiety, depression, genre, effect };

}).then(raw => {
  const data = raw.filter(d => d !== null);
  drawBarChart(data);
  drawAlluvial(data);
  drawScatter(data);
});

// =============================================================
//  VIEW 1 – BAR CHART  (overview)
//  Average depression score per favorite genre.
//  Simple and readable — gives the audience an at-a-glance
//  summary of which genres correlate with higher depression.
// =============================================================
function drawBarChart(data) {
  const container = document.getElementById("bar-area");
  const W = container.clientWidth;
  const H = container.clientHeight;
  const margin = { top: 18, right: 30, bottom: 80, left: 52 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top  - margin.bottom;

  const svg = d3.select("#bar-area").append("svg")
    .attr("width", W).attr("height", H);

  // Main drawing group offset by margins
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ── Compute average depression per genre ──────────────────
  const genres = [...new Set(data.map(d => d.genre))].sort();

  // rollup: genre → mean depression score
  const avgMap = d3.rollup(
    data,
    v => d3.mean(v, d => d.depression),
    d => d.genre
  );

  // Sort genres by average depression descending so bars rank clearly
  const sorted = genres.sort((a, b) => avgMap.get(b) - avgMap.get(a));

  // ── Scales ───────────────────────────────────────────────
  // X: one band per genre
  const xScale = d3.scaleBand()
    .domain(sorted)
    .range([0, iW])
    .padding(0.28);

  // Y: 0 to slightly above the max average (leave headroom)
  const yMax = d3.max([...avgMap.values()]);
  const yScale = d3.scaleLinear()
    .domain([0, Math.ceil(yMax) + 0.5])
    .range([iH, 0]);

  // ── Horizontal grid lines ─────────────────────────────────
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  // ── X axis with rotated genre labels ─────────────────────
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text")
      .attr("transform", "rotate(-35)")
      .attr("text-anchor", "end")
      .attr("dy", "0.35em")
      .attr("dx", "-0.4em");

  // ── Y axis ────────────────────────────────────────────────
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5))
    .call(ax => ax.select(".domain").remove());

  // ── Y axis label ─────────────────────────────────────────
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Avg. Depression Score (0–10)");

  // ── Bars ─────────────────────────────────────────────────
  // Single blue color for all bars — clean, unambiguous encoding
  const BAR_COLOR = "#1FCC23";

  sorted.forEach(genre => {
    const avg = avgMap.get(genre);

    // Bar rectangle
    g.append("rect")
      .attr("x", xScale(genre))
      .attr("y", yScale(avg))
      .attr("width", xScale.bandwidth())
      .attr("height", iH - yScale(avg))
      .attr("fill", BAR_COLOR)
      .attr("fill-opacity", 0.75)
      .attr("rx", 2)
      .on("mouseover", event => showTip(
        `<b>${genre}</b><br>Avg Depression: ${avg.toFixed(2)}`, event))
      .on("mousemove", event => showTip(
        `<b>${genre}</b><br>Avg Depression: ${avg.toFixed(2)}`, event))
      .on("mouseout", hideTip);

    // Value label above bar
    g.append("text")
      .attr("x", xScale(genre) + xScale.bandwidth() / 2)
      .attr("y", yScale(avg) - 3)
      .attr("text-anchor", "middle")
      .attr("font-size", 8.5)
      .attr("fill", "#555")
      .attr("font-family", "Arial, sans-serif")
      .text(avg.toFixed(1));
  });

  // ── Legend ───────────────────────────────────────────────
  const lx = iW - 120;
  const ly = 0;

  const lg = g.append("g").attr("transform", `translate(${lx},${ly})`);

  // Colored bar swatch
  lg.append("rect")
    .attr("width", 14).attr("height", 10)
    .attr("fill", BAR_COLOR).attr("fill-opacity", 0.75).attr("rx", 2);

  lg.append("text")
    .attr("x", 18).attr("y", 9)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif")
    .text("Avg. Depression Score");
}


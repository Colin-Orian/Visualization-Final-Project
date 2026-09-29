function makeChapterFlow(coreData, chapters, articles) {

    const LOCATIONS = [
        "Arctic", "Antarctic", "North Atlantic", "Atlantic", "Pacific",
        "Mediterranean", "Southern Ocean", "Indian Ocean",
        "Baltic Sea", "North Sea", "Caribbean", "Gulf of Mexico"
    ];
    const headerHeight = 40;

    // Topic column never moves between modes
    const topicRectX = 720, topicRectW = 10, topicLabelX = 735;

    // Fixed color scale for the 12 canonical locations, shared across both modes
    const locationColor = d3.scaleOrdinal()
        .domain(LOCATIONS)
        .range(d3.schemeTableau10.concat(d3.schemeTableau10).slice(0, LOCATIONS.length));

    // Toggle button inserted before chapterSVG so it is hidden/shown with it
    let currentMode = "A";
    // Semantic selection survives redraws because it stores the entity identity,
    // not a reference to an SVG element from either column ordering.
    let persistentSelection = null;
    const btn = document.createElement("button");
    btn.style.cssText = "display:block; margin:4px 10px; padding:3px 12px; cursor:pointer; font-size:13px;";
    chapterSVG.node().parentNode.insertBefore(btn, chapterSVG.node());

    Promise.all([
        d3.json("./data/chaptersTopics.json"),
        d3.json("./data/chapterLocations.json")
    ]).then(([topicData, locData]) => {

        // ── Shared layout (computed once) ─────────────────────────────────

        const uniqueTopics = Array.from(
            new Set(Object.values(topicData).flatMap(d => Object.keys(d)))
        );

        // Chapter block heights proportional to connected topic count
        let totalCount = 0;
        for (let i = 0; i < chapters.length; i++) {
            const entry = topicData[chapters[i].woaii_chapter];
            chapters[i].topicCount = entry ? Object.keys(entry).length + 4 : 4;
            totalCount += chapters[i].topicCount;
        }
        const chapterToScreen = d3.scaleLinear([0, totalCount], [headerHeight, height]);
        chapters[0].y = 0;
        for (let i = 1; i < chapters.length; i++) {
            chapters[i].y = chapters[i - 1].y + chapters[i - 1].topicCount;
        }

        // Location column: 12 canonical slots evenly spaced
        const locStep = (height - headerHeight) / LOCATIONS.length;
        const locY = {};
        LOCATIONS.forEach((loc, i) => { locY[loc] = headerHeight + i * locStep; });

        // Topic column scale
        const topicHeight = 20;
        const topicToScreen = d3.scaleLinear(
            [0, topicHeight * uniqueTopics.length], [headerHeight, height]
        );
        const topicLoc = {};
        uniqueTopics.forEach((t, i) => { topicLoc[t] = topicHeight * i; });

        // Mode B: Location → Topic edges derived at runtime.
        // A location links to a topic if any chapter has both in its data.
        const locTopicLinks = {};
        LOCATIONS.forEach(loc => { locTopicLinks[loc] = new Set(); });
        Object.entries(locData).forEach(([chapId, locs]) => {
            const chapTopics = topicData[chapId];
            if (!chapTopics) return;
            Object.keys(locs).forEach(locName => {
                if (!locTopicLinks[locName]) return;
                Object.keys(chapTopics).forEach(topicName => {
                    locTopicLinks[locName].add(topicName);
                });
            });
        });

        // The stored chapter-topic totals count repeated OpenAlex field assignments.
        // Build a separate lookup whose unit is a distinct work in a chapter. A Set
        // collapses repeated field assignments within a work (and duplicate core rows).
        const articlesById = new Map(articles.map(article => [article.id, article]));
        const chapterTopicWorkSets = {};
        coreData.forEach(row => {
            const article = articlesById.get(row.openalex_work_id);
            if (!article) return;

            const fieldsInWork = new Set(
                (article.topics || [])
                    .filter(topic => topic.name === "field")
                    .map(topic => topic.display_name)
            );

            fieldsInWork.forEach(fieldName => {
                if (!chapterTopicWorkSets[row.woaii_chapter]) {
                    chapterTopicWorkSets[row.woaii_chapter] = {};
                }
                if (!chapterTopicWorkSets[row.woaii_chapter][fieldName]) {
                    chapterTopicWorkSets[row.woaii_chapter][fieldName] = new Set();
                }
                chapterTopicWorkSets[row.woaii_chapter][fieldName].add(row.openalex_work_id);
            });
        });

        const chapterTopicWorkCounts = {};
        Object.entries(chapterTopicWorkSets).forEach(([chapId, fieldSets]) => {
            chapterTopicWorkCounts[chapId] = {};
            Object.entries(fieldSets).forEach(([fieldName, workIds]) => {
                chapterTopicWorkCounts[chapId][fieldName] = workIds.size;
            });
        });

        // ── render: clear SVG and draw the chosen mode ────────────────────

        function render(mode) {
            chapterSVG.selectAll("*").remove();

            btn.innerHTML = mode === "A"
                ? "Mode A: Location &#x2192; Chapter &#x2192; Topic"
                : "Mode B: Chapter &#x2192; Location &#x2192; Topic";

            // Groups must be in paint order: columns behind links, tooltip in front
            const locationColumn = chapterSVG.append("g").attr("id", "locationColumn");
            const chapterColumn  = chapterSVG.append("g").attr("id", "chapterColumn");
            const topicColumn    = chapterSVG.append("g").attr("id", "topicColumn");
            const lines          = chapterSVG.append("g").attr("id", "chapter-links");
            const tooltip        = chapterSVG.append("text")
                .attr("class", "tooltip").attr("fill", "black")
                .style("pointer-events", "none").style("font-size", "20px");

            if (mode === "A") {
                drawModeA(locationColumn, chapterColumn, topicColumn, lines, tooltip);
            } else {
                drawModeB(locationColumn, chapterColumn, topicColumn, lines, tooltip);
            }
        }

        // ── Shared interaction state ──────────────────────────────────────

        function makeInteractionController(mode, locationColumn, chapterColumn, topicColumn, lines, tooltip) {
            function restoreAll() {
                lines.selectAll("path").transition().duration(350).style("opacity", 1);
                locationColumn.selectAll("*").transition().duration(350).style("opacity", 1);
                chapterColumn.selectAll("*").transition().duration(350).style("opacity", 1);
                topicColumn.selectAll("*").transition().duration(350).style("opacity", 1);
            }

            // Resolve the complete visible path for a semantic entity selection.
            // The relationship objects are read as-is; no counts or links are changed.
            function getVisiblePath(selection) {
                const visible = {
                    locations: new Set(),
                    chapters: new Set(),
                    topics: new Set()
                };

                if (mode === "A") {
                    if (selection.type === "location") {
                        visible.locations.add(selection.value);
                        Object.entries(locData).forEach(([chapId, locations]) => {
                            if (selection.value in locations) visible.chapters.add(chapId);
                        });
                        visible.chapters.forEach(chapId => {
                            Object.keys(topicData[chapId] || {}).forEach(topic => visible.topics.add(topic));
                        });
                    } else if (selection.type === "chapter") {
                        visible.chapters.add(selection.value);
                        Object.keys(locData[selection.value] || {}).forEach(location => visible.locations.add(location));
                        Object.keys(topicData[selection.value] || {}).forEach(topic => visible.topics.add(topic));
                    } else if (selection.type === "topic") {
                        visible.topics.add(selection.value);
                        Object.entries(topicData).forEach(([chapId, topics]) => {
                            if (selection.value in topics) visible.chapters.add(chapId);
                        });
                        visible.chapters.forEach(chapId => {
                            Object.keys(locData[chapId] || {}).forEach(location => visible.locations.add(location));
                        });
                    }
                } else {
                    if (selection.type === "chapter") {
                        visible.chapters.add(selection.value);
                        Object.keys(locData[selection.value] || {}).forEach(location => visible.locations.add(location));
                        visible.locations.forEach(location => {
                            (locTopicLinks[location] || new Set()).forEach(topic => visible.topics.add(topic));
                        });
                    } else if (selection.type === "location") {
                        visible.locations.add(selection.value);
                        Object.entries(locData).forEach(([chapId, locations]) => {
                            if (selection.value in locations) visible.chapters.add(chapId);
                        });
                        (locTopicLinks[selection.value] || new Set()).forEach(topic => visible.topics.add(topic));
                    } else if (selection.type === "topic") {
                        visible.topics.add(selection.value);
                        Object.entries(locTopicLinks).forEach(([location, topics]) => {
                            if (topics.has(selection.value)) visible.locations.add(location);
                        });
                        Object.entries(locData).forEach(([chapId, locations]) => {
                            if (Object.keys(locations).some(location => visible.locations.has(location))) {
                                visible.chapters.add(chapId);
                            }
                        });
                    }
                }

                return visible;
            }

            function linkIsVisible(element, selection, visible) {
                const linkType = element.getAttribute("data-link-type");
                const chapter = element.getAttribute("data-chapter");
                const location = element.getAttribute("data-location");
                const topic = element.getAttribute("data-topic");

                if (mode === "A") {
                    if (selection.type === "location") {
                        return linkType === "lc" ? location === selection.value : visible.chapters.has(chapter);
                    }
                    if (selection.type === "chapter") return chapter === selection.value;
                    if (selection.type === "topic") {
                        return linkType === "ct" ? topic === selection.value : visible.chapters.has(chapter);
                    }
                } else {
                    if (selection.type === "chapter") {
                        return linkType === "lc" ? chapter === selection.value : visible.locations.has(location);
                    }
                    if (selection.type === "location") return location === selection.value;
                    if (selection.type === "topic") {
                        return linkType === "lt" ? topic === selection.value : visible.locations.has(location);
                    }
                }
                return false;
            }

            function applySelection(selection) {
                if (!selection) {
                    restoreAll();
                    return;
                }

                const visible = getVisiblePath(selection);
                lines.selectAll("path").transition().duration(350).style("opacity", function() {
                    return linkIsVisible(this, selection, visible) ? 1 : 0;
                });
                locationColumn.selectAll("*").transition().duration(350).style("opacity", location =>
                    visible.locations.has(location) ? 1 : 0.3
                );
                chapterColumn.selectAll("*").transition().duration(350).style("opacity", chapter =>
                    visible.chapters.has(chapter.woaii_chapter) ? 1 : 0.3
                );
                topicColumn.selectAll("*").transition().duration(350).style("opacity", topic =>
                    visible.topics.has(topic) ? 1 : 0.3
                );
            }

            function selectionFor(type, datum) {
                return {
                    type,
                    value: type === "chapter" ? datum.woaii_chapter : datum
                };
            }

            function showTooltip(event, text) {
                // Resolve pointer coordinates in the root SVG so the same tooltip
                // positioning works for rectangles and curved path elements.
                const [mx, my] = d3.pointer(event, chapterSVG.node());
                tooltip.attr("x", mx).attr("y", my)
                    .text(text)
                    .style("text-anchor", "start");
            }

            function formatWorkCount(count) {
                return `${count} ${count === 1 ? "work" : "works"}`;
            }

            function preview(type, event, datum) {
                if (type === "chapter") {
                    showTooltip(event, datum.chapter_title ? datum.chapter_title.slice(0, 40) : "");
                }
                applySelection(selectionFor(type, datum));
            }

            function bindRelationship(selection, tooltipText) {
                selection
                    .on("mouseover", event => showTooltip(event, tooltipText))
                    // Leaving a link clears its tooltip and restores any node
                    // selection that was made persistent by clicking.
                    .on("mouseout", restorePersistent);
            }

            function restorePersistent() {
                tooltip.text("");
                applySelection(persistentSelection);
            }

            function togglePersistent(type, event, datum) {
                event.stopPropagation();
                const clicked = selectionFor(type, datum);
                const isCurrent = persistentSelection &&
                    persistentSelection.type === clicked.type &&
                    persistentSelection.value === clicked.value;
                persistentSelection = isCurrent ? null : clicked;
                applySelection(persistentSelection);
            }

            function bind(selection, type) {
                selection
                    .on("mouseover", (event, datum) => preview(type, event, datum))
                    .on("mouseout", restorePersistent)
                    .on("click", (event, datum) => togglePersistent(type, event, datum));
            }

            return {
                bind,
                bindRelationship,
                formatWorkCount,
                applyPersistentSelection: () => applySelection(persistentSelection)
            };
        }

        // ── Mode A: Location → Chapter → Topic ───────────────────────────

        function drawModeA(locationColumn, chapterColumn, topicColumn, lines, tooltip) {
            const locRectX = 150, locRectW = 20, locLabelX = locRectX - 5;
            const chapRectX = 450, chapRectW = 30, chapLabelX = 485;

            // Column headers
            const hdr = chapterSVG.append("g");
            hdr.append("text").attr("x", locRectX).attr("y", 30)
                .text("Location").style("font-size", "20px").style("font-weight", "bold");
            hdr.append("text").attr("x", chapRectX).attr("y", 30)
                .text("WOA II Chapter").style("font-size", "20px").style("font-weight", "bold");
            hdr.append("text").attr("x", topicRectX).attr("y", 30)
                .text("OpenAlex Topic").style("font-size", "20px").style("font-weight", "bold");

            const interaction = makeInteractionController(
                "A", locationColumn, chapterColumn, topicColumn, lines, tooltip
            );

            // ── Location column ───────────────────────────────────────────

            const locationRects = locationColumn.selectAll(".locRect")
                .data(LOCATIONS).enter().append("rect")
                .attr("x", locRectX).attr("y", d => locY[d])
                .attr("width", locRectW).attr("height", locStep - 2)
                .attr("fill", d => locationColor(d)).attr("stroke", "black")
                .attr("id", d => "loc_box_" + d);
            interaction.bind(locationRects, "location");

            locationColumn.selectAll(".locLabel")
                .data(LOCATIONS).enter().append("text")
                .attr("x", locLabelX).attr("y", d => locY[d] + locStep / 2)
                .attr("text-anchor", "end")
                .attr("id", d => "loc_text_" + d)
                .text(d => d).style("fill", "black");

            // ── Chapter column ────────────────────────────────────────────

            const chapterRects = chapterColumn.selectAll(".chapterRect")
                .data(chapters).enter().append("rect")
                .attr("x", chapRectX)
                .attr("y", d => chapterToScreen(d.y))
                .attr("height", d => chapterToScreen(d.topicCount) - headerHeight)
                .attr("width", chapRectW)
                .attr("fill", d => chapterColor[d.woaii_chapter]).attr("stroke", "black")
                .attr("id", d => "woaii_chapter_" + d.woaii_chapter);
            interaction.bind(chapterRects, "chapter");

            chapterColumn.selectAll(".chapterLabel")
                .data(chapters).enter().append("text")
                .attr("id", d => "chapter_annot_" + d.woaii_chapter)
                .attr("x", chapLabelX)
                .attr("y", d => chapterToScreen(d.y) + (chapterToScreen(d.topicCount) - headerHeight) / 2)
                .text(d => d.woaii_chapter).style("fill", "black");

            // ── Topic column ──────────────────────────────────────────────

            const topicRects = topicColumn.selectAll(".topicRect")
                .data(uniqueTopics).enter().append("rect")
                .attr("x", topicRectX).attr("y", d => topicToScreen(topicLoc[d]))
                .attr("width", topicRectW)
                .attr("height", topicToScreen(topicHeight) - headerHeight)
                .attr("fill", "lightblue").attr("stroke", "black")
                .attr("id", d => "topic_box_" + d);
            interaction.bind(topicRects, "topic");

            topicColumn.selectAll(".topicLabel")
                .data(uniqueTopics).enter().append("text")
                .attr("x", topicLabelX)
                .attr("y", d => topicToScreen(topicLoc[d] + topicHeight / 2))
                .attr("id", d => "topic_text_" + d)
                .text(d => d).style("fill", "black");

            // ── Location → Chapter links ──────────────────────────────────
            // ID: "lc_<chapId>_<locName>" — chapId at [1], locName at slice(2)
            chapters.forEach(ch => {
                const chapId = ch.woaii_chapter;
                const chapLocs = locData[chapId];
                if (!chapLocs) return;
                const rightY = chapterToScreen(ch.y) + (chapterToScreen(ch.topicCount) - headerHeight) / 2;
                Object.keys(chapLocs).forEach(locName => {
                    if (locY[locName] === undefined) return;
                    const leftY  = locY[locName] + locStep / 2;
                    const leftX  = locRectX + locRectW;
                    const rightX = chapRectX;
                    const midX   = (leftX + rightX) / 2;
                    const path   = new d3.Path();
                    path.moveTo(leftX, leftY);
                    path.bezierCurveTo(midX, leftY, midX, rightY, rightX, rightY);
                    const link = lines.append("path")
                        .attr("stroke", chapterColor[chapId]).attr("d", path)
                        .attr("id", "lc_" + chapId + "_" + locName)
                        .attr("data-link-type", "lc")
                        .attr("data-chapter", chapId)
                        .attr("data-location", locName)
                        .attr("fill", "none");
                    interaction.bindRelationship(
                        link,
                        `${locName} \u2194 Chapter ${chapId}: ${interaction.formatWorkCount(chapLocs[locName])}`
                    );
                });
            });

            // ── Chapter → Topic links ─────────────────────────────────────
            // ID: "ct_<chapId>_<topicName>" — chapId at [1], topicName at slice(2)
            chapters.forEach(ch => {
                const chapId     = ch.woaii_chapter;
                const chapTopics = topicData[chapId];
                if (!chapTopics) return;
                const leftY  = chapterToScreen(ch.y) + (chapterToScreen(ch.topicCount) - headerHeight) / 2;
                const leftX  = chapRectX + chapRectW;
                Object.keys(chapTopics).forEach(topicName => {
                    if (topicLoc[topicName] === undefined) return;
                    const rightX = topicRectX;
                    const rightY = topicToScreen(topicLoc[topicName] + topicHeight / 2);
                    const midX   = (leftX + rightX) / 2;
                    const path   = new d3.Path();
                    path.moveTo(leftX, leftY);
                    path.bezierCurveTo(midX, leftY, midX, rightY, rightX, rightY);
                    const link = lines.append("path")
                        .attr("stroke", chapterColor[chapId]).attr("d", path)
                        .attr("id", "ct_" + chapId + "_" + topicName)
                        .attr("data-link-type", "ct")
                        .attr("data-chapter", chapId)
                        .attr("data-topic", topicName)
                        .attr("fill", "none");
                    const workCount = chapterTopicWorkCounts[chapId]?.[topicName] || 0;
                    interaction.bindRelationship(
                        link,
                        `Chapter ${chapId} \u2194 ${topicName}: ${interaction.formatWorkCount(workCount)}`
                    );
                });
            });

            interaction.applyPersistentSelection();
        }

        // ── Mode B: Chapter → Location → Topic ───────────────────────────

        function drawModeB(locationColumn, chapterColumn, topicColumn, lines, tooltip) {
            // Chapters move to the left; locations move to the middle
            const chapRectX = 150, chapRectW = 30, chapLabelX = chapRectX - 5;
            const locRectX  = 450, locRectW  = 20, locLabelX  = locRectX + locRectW + 5;

            // Column headers
            const hdr = chapterSVG.append("g");
            hdr.append("text").attr("x", chapRectX).attr("y", 30)
                .text("WOA II Chapter").style("font-size", "20px").style("font-weight", "bold");
            hdr.append("text").attr("x", locRectX).attr("y", 30)
                .text("Location").style("font-size", "20px").style("font-weight", "bold");
            hdr.append("text").attr("x", topicRectX).attr("y", 30)
                .text("OpenAlex Topic").style("font-size", "20px").style("font-weight", "bold");

            const interaction = makeInteractionController(
                "B", locationColumn, chapterColumn, topicColumn, lines, tooltip
            );

            // ── Chapter column (left) ─────────────────────────────────────

            const chapterRects = chapterColumn.selectAll(".chapterRect")
                .data(chapters).enter().append("rect")
                .attr("x", chapRectX)
                .attr("y", d => chapterToScreen(d.y))
                .attr("height", d => chapterToScreen(d.topicCount) - headerHeight)
                .attr("width", chapRectW)
                .attr("fill", d => chapterColor[d.woaii_chapter]).attr("stroke", "black")
                .attr("id", d => "woaii_chapter_" + d.woaii_chapter);
            interaction.bind(chapterRects, "chapter");

            chapterColumn.selectAll(".chapterLabel")
                .data(chapters).enter().append("text")
                .attr("id", d => "chapter_annot_" + d.woaii_chapter)
                .attr("x", chapLabelX).attr("text-anchor", "end")
                .attr("y", d => chapterToScreen(d.y) + (chapterToScreen(d.topicCount) - headerHeight) / 2)
                .text(d => d.woaii_chapter).style("fill", "black");

            // ── Location column (middle) ──────────────────────────────────

            const locationRects = locationColumn.selectAll(".locRect")
                .data(LOCATIONS).enter().append("rect")
                .attr("x", locRectX).attr("y", d => locY[d])
                .attr("width", locRectW).attr("height", locStep - 2)
                .attr("fill", d => locationColor(d)).attr("stroke", "black")
                .attr("id", d => "loc_box_" + d);
            interaction.bind(locationRects, "location");

            locationColumn.selectAll(".locLabel")
                .data(LOCATIONS).enter().append("text")
                .attr("x", locLabelX).attr("y", d => locY[d] + locStep / 2)
                .attr("id", d => "loc_text_" + d)
                .text(d => d).style("fill", "black");

            // ── Topic column (right, unchanged) ───────────────────────────

            const topicRects = topicColumn.selectAll(".topicRect")
                .data(uniqueTopics).enter().append("rect")
                .attr("x", topicRectX).attr("y", d => topicToScreen(topicLoc[d]))
                .attr("width", topicRectW)
                .attr("height", topicToScreen(topicHeight) - headerHeight)
                .attr("fill", "lightblue").attr("stroke", "black")
                .attr("id", d => "topic_box_" + d);
            interaction.bind(topicRects, "topic");

            topicColumn.selectAll(".topicLabel")
                .data(uniqueTopics).enter().append("text")
                .attr("x", topicLabelX)
                .attr("y", d => topicToScreen(topicLoc[d] + topicHeight / 2))
                .attr("id", d => "topic_text_" + d)
                .text(d => d).style("fill", "black");

            // ── Chapter → Location links ──────────────────────────────────
            // Same ID format as Mode A lc_ links; direction is reversed (left→right now chap→loc)
            chapters.forEach(ch => {
                const chapId   = ch.woaii_chapter;
                const chapLocs = locData[chapId];
                if (!chapLocs) return;
                const leftY  = chapterToScreen(ch.y) + (chapterToScreen(ch.topicCount) - headerHeight) / 2;
                const leftX  = chapRectX + chapRectW;
                Object.keys(chapLocs).forEach(locName => {
                    if (locY[locName] === undefined) return;
                    const rightY = locY[locName] + locStep / 2;
                    const rightX = locRectX;
                    const midX   = (leftX + rightX) / 2;
                    const path   = new d3.Path();
                    path.moveTo(leftX, leftY);
                    path.bezierCurveTo(midX, leftY, midX, rightY, rightX, rightY);
                    const link = lines.append("path")
                        .attr("stroke", chapterColor[chapId]).attr("d", path)
                        .attr("id", "lc_" + chapId + "_" + locName)
                        .attr("data-link-type", "lc")
                        .attr("data-chapter", chapId)
                        .attr("data-location", locName)
                        .attr("fill", "none");
                    interaction.bindRelationship(
                        link,
                        `Chapter ${chapId} \u2194 ${locName}: ${interaction.formatWorkCount(chapLocs[locName])}`
                    );
                });
            });

            // ── Location → Topic links ────────────────────────────────────
            // ID: "lt_<locName>_<topicName>"; semantic data attributes support interaction filtering.
            // One line per unique (loc, topic) pair derived from locTopicLinks.
            Object.entries(locTopicLinks).forEach(([locName, topicSet]) => {
                if (locY[locName] === undefined) return;
                const leftY  = locY[locName] + locStep / 2;
                const leftX  = locRectX + locRectW;
                topicSet.forEach(topicName => {
                    if (topicLoc[topicName] === undefined) return;
                    const rightX = topicRectX;
                    const rightY = topicToScreen(topicLoc[topicName] + topicHeight / 2);
                    const midX   = (leftX + rightX) / 2;
                    const path   = new d3.Path();
                    path.moveTo(leftX, leftY);
                    path.bezierCurveTo(midX, leftY, midX, rightY, rightX, rightY);
                    lines.append("path")
                        .attr("stroke", locationColor(locName)).attr("d", path)
                        .attr("id", "lt_" + locName + "_" + topicName)
                        .attr("data-link-type", "lt")
                        .attr("data-location", locName).attr("data-topic", topicName)
                        .attr("fill", "none");
                });
            });

            interaction.applyPersistentSelection();
        }

        // ── Bootstrap ────────────────────────────────────────────────────

        btn.onclick = () => {
            currentMode = currentMode === "A" ? "B" : "A";
            render(currentMode);
        };

        render(currentMode);

    }); // end Promise.all
}



function makeChapterLinks(coreData, chapters) {
  jsonName = "chaptersTopics.json"

  result = d3.json("./data/" + jsonName).then( data => {
    if(data == undefined){
      topicsDict = toDict(topics)
      linksResults = makeLinks(coreData, chapters, topicsDict)
      return linksResults
    }else{
      return data
    }
  })
  return result
}

function selectTopics(entry){
    let topics = entry.topics
    results = []
    topics.forEach(element => {

        if(element.name === "field"){
            result = [entry.id, element.display_name]
            results.push(result)
        }
    });

    return results;
}

function toDict(array){
  temp = {}
  for(i = 0; i < array.length; i ++){
    if(array[i].length != 0){

      id = array[i][0][0]
      temp[id] = []

      for(j = 0; j < array[i].length; j ++){
        temp[id].push(array[i][j][1])
      }
    }
  }

  return temp
}


function makeLinks(coreData, chapters, articles){
  chapterDict = {}

  for(i = 0; i < coreData.length; i ++){
    chapter = coreData[i].woaii_chapter
    if(chapterDict[chapter] == null){
        chapterDict[chapter] = {}
    }

    openAlexId = coreData[i].openalex_work_id
    topics = articles[openAlexId]

    if(topics != null){
      for(j = 0; j < topics.length; j ++){
        if(chapterDict[chapter][topics[j]] == null){
          chapterDict[chapter][topics[j]] = 1
        }else{
          chapterDict[chapter][topics[j]] += 1
        }
      }
    }

  }
  return chapterDict
}

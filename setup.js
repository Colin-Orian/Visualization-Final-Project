const width = 1050;
const height = 900;
startYearGlobal = null
endYearGlobal = null
//each of the sections of the UI
const svg = d3.create("svg")
    
    .attr("width", width)
    .attr("height", height);

const lineGraphSvg = d3.create("svg")
        .attr("width", 900)
        .attr("height", 545)
        .attr("class", "linegraphsvg")

const chapterTimelineSVG = d3.create("svg")
            .attr("width", 900)
            .attr("height", 545)
            .attr("class", "chapterTimeline")      

const networkSvg = d3.create("div")
            .attr("width", 900)
            .attr("height", 545)
            .attr("class", "networksvg")
const overviewWrapper = d3.create("div")

const publicationList = d3.create("ul")

const chapterSVG = d3.create("svg")
                .attr("width", width)
                .attr("height", height)

currentRoot = null
filterData = null
currentData = null
currentLeaves = null
seedArticle = null

dataFolder = "./data/"
chapterColor = {}
data = readHierachy(dataFolder + "hierachy.csv") //read the hiearchy data from the csv
data.then((d) => {

    openAlexData = readOpenAlex(dataFolder + "openalexworks.json") //read the openalex data
    //currentData = openAlexData
    openAlexData.then((o) =>
    { 

        coreWorks = readCSV(dataFolder + "core_works_three.csv", "|")
        
        coreWorks.then(c =>{
            chapters = readCSV(dataFolder + "woa_two.csv", "|")
            chapters.then(w =>{
                //The current data is the data that all the vsulizations work on.
                //It will change depending on the filters, but right now it's the full dataset.
                coreData = c
                woaData = w
                currentData = o 
                
                startYearGlobal = d3.min(o, current => current.publication_year)
                
                endYearGlobal = d3.max(o, current => current.publication_year)
                
                //When there is a change to the topic filter or timeline filter, call this function to
                //filter the data.
                filterData = () => {
                    
                    currentLeaves = currentRoot.leaves()
                    //are the leaves within the date range?
                    result = o.filter((m) =>{
                        return (m.publication_year >= startYearGlobal && m.publication_year <= endYearGlobal)
                    })

                    //are the leaves within the topic filter?
                    topicFilter = result.filter((m) =>{
                        entryTopics = m.topics.filter((t) =>{
                            return t.name == "topic"
                        })
                        
                        for(leavesIndex = 0; leavesIndex < currentLeaves.length; leavesIndex ++) {
                            for(entryIndex = 0; entryIndex < entryTopics.length; entryIndex ++){
                                if(currentLeaves[leavesIndex].id == entryTopics[entryIndex].display_name){
                                    return true
                                }
                            }
                        }
                        return false;
                    })
                    currentData = topicFilter
                    //Since there was an update, update all visulizations
                    updateTimeGraph(startYearGlobal, endYearGlobal)
                    updateScrollable(currentData)
                    updateOverview(currentData)
                    
                }
                woaData = woaData.sort( (a, b) =>{
                    return a.woaii_chapter < b.woaii_chapter
                })
                const color = d3.scaleOrdinal().domain(woaData.map(d => {d.woaii_chapter}))
                                   .range(d3.schemeCategory10)
                for(i = 0; i < woaData.length; i ++){
                    chapterColor[woaData[i].woaii_chapter] = color(woaData[i].woaii_chapter)
                    
                }
                
                //make all the sections
                makeSunburst(d)
                currentLeaves = currentRoot.leaves()

                makeTimelineBar(startYearGlobal, endYearGlobal)
                makeTimelineGraph(startYearGlobal, endYearGlobal)
                makeScrollable(currentData)
                makeOverview(currentData)
                makeNetwork()
                makeChapterFlow(coreData, woaData, o)
                makeChapterTimeline(coreData, woaData)

            })
        })
        
    }
    )
})


//This portion is to allow the user to toggle from the timeline graph to the network graph.
bottomHeaders = [d3.select("#timelineHeader"), d3.select("#networkHeader"), d3.select("#chapterTimelineHeader")]
bottomBodies = [lineGraphSvg, networkSvg, chapterTimelineSVG]
setToggleHeaders(bottomHeaders, bottomBodies)

topRightHeaders = [d3.select("#articleHeader")]
topRightBodies = [publicationList]
topRightHeaders[0].attr("class", "headerSpacer-selected")

middleHeaders = [d3.select("#overviewHeader")]
middleBodies = [overviewWrapper]
setToggleHeaders(middleHeaders, middleBodies)

topLeftHeaders = [d3.select("#filterHeader"), d3.select("#chapterHeader")]
topLeftBodies = [svg, chapterSVG]
setToggleHeaders(topLeftHeaders, topLeftBodies)


setBodies(filterContainer, topLeftBodies)
setBodies(lineGraphContainer, bottomBodies)
setBodies(listContainer, topRightBodies)
setBodies(StatisticsContainer, middleBodies)


function setBodies(container, bodies){
    bodies.forEach(element => {
        container.append(element.node())
    });
}

function setToggleHeaders(headers, bodies){
    for(let i = 0; i < headers.length; i ++){
        headers[i].on("click", () => {
            for(let j = 0; j < bodies.length; j ++){
                if(j === i){
                    headers[j].attr("class", "headerSpacer-selected")
                    bodies[j].style("display", "initial")
                    
                }else{
                    headers[j].attr("class", "headerSpacer")
                    bodies[j].style("display", "none")
                    
                }
            }
            
        })

        bodies[i].style("display", "none")
    }
    headers[0].attr("class", "headerSpacer-selected")
    bodies[0].style("display", "initial")
}   


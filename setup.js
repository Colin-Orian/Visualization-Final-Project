const width = 900;
const height = 810;
startYearGlobal = null
endYearGlobal = null

const svg = d3.create("svg")
    
    .attr("width", width)
    .attr("height", height);

const lineGraphSvg = d3.create("svg")
        .attr("width", 900)
        .attr("height", 400)
        .attr("class", "linegraphsvg")

currentRoot = null
filterData = null
currentData = null
currentLeaves = null
data = readHierachy("./data/hierachy.csv")

data.then((d) => {

    openAlexData = readOpenAlex("./data/openalexworks.json")
    //currentData = openAlexData
    openAlexData.then((o) =>
    { 
        currentData = o
        startYearGlobal = d3.min(o, current => current.publication_year)
        
        endYearGlobal = d3.max(o, current => current.publication_year)

        filterData = () => {
            
            currentLeaves = currentRoot.leaves()
            //console.log(currentRoot.leaves());
            result = o.filter((m) =>{
                return (m.publication_year >= startYearGlobal && m.publication_year <= endYearGlobal)
            })

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
            updateTimeGraph(startYearGlobal, endYearGlobal)
            updateScrollable(currentData)
            
        }
        
        makeSunburst(d)
        currentLeaves = currentRoot.leaves()

        makeTimelineBar(startYearGlobal, endYearGlobal)
        makeTimelineGraph(startYearGlobal, endYearGlobal)
        makeScrollable(currentData)
        
    }
    )
})




filterContainer.append(svg.node());
lineGraphContainer.append(lineGraphSvg.node())
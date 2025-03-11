

const width = 3000;
const height = 1500;
startYearGlobal = null
endYearGlobal = null

const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height);

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
            console.log(currentData)
        }
        
        makeSunburst(d)
        currentLeaves = currentRoot.leaves()

        makeTimelineBar(startYearGlobal, endYearGlobal)
        makeTimelineGraph(startYearGlobal, endYearGlobal)

        
    }
    )
})




container.append(svg.node());
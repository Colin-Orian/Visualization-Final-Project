function makeChapterFlow(coreData, chapters, articles){

    
    counter = 0
    console.log(articles[0]["id"])
    console.log(coreData[0]["title"])

    angleStep = (2 * Math.PI) / chapters.length
    stepCounter = 0

    
    

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow,  chapters.length + 1))
    topics = articles.map(selectTopics)
    let uniqueTopics = new Set()
    topics.forEach(topic =>{
        for(i = 0; i < topic.length; i ++){
            uniqueTopics.add(topic[i][1])
        }
    })

        uniqueTopics = Array.from(uniqueTopics)
        links = makeChapterLinks(coreData, chapters).then(data => {
        console.log(data)
        
        //let chapterStep = height / chapters.length
        //chapterCount = 0
        console.log(chapters)

        let totalCount = 0
        for(i = 0; i < chapters.length; i ++){
          //temp = (chapterStep * chapterCount) + 5
          otherTemp = data[chapters[i].woaii_chapter]
          topicCount = 0
          if(otherTemp == undefined){
            topicCount = 4 //Add extra in case there is no relationship
          }else{
            topicCount = Object.keys(data[chapters[i].woaii_chapter]).length + 4
          }
          
          
          chapters[i].topicCount = topicCount
          totalCount += topicCount
          //chapters[i].y = temp
          //chapterCount += 1
        }
        
        chapterToScreen = d3.scaleLinear([0, totalCount], [0, height])
        
        currentY = 0
        chapters[0].y = currentY
        currentY += (chapters[0].topicCount)
        for(i = 1; i < chapters.length; i ++){
          chapters[i].y = currentY
          currentY += (chapters[i].topicCount)
          
        }
        
        chapterColumn = chapterSVG.append("g")
        
        chapterColumn.selectAll(".chapterCircle")
                  .data(chapters)
                  .enter()
                  .append("rect")
                  .attr("x",  10)
                  .attr("y", d => {
                    return (chapterToScreen(d.y) + 0)
                   })
                  .attr("height", d =>{
                    return chapterToScreen(d.topicCount)
                  })
                  .attr("width", 10)
                  .attr("fill", d => {
                    return "lightgreen"
                  })
                  .attr("stroke", "black")
                  .on("mouseover", mouseMove)
                  .on("mouseout", mouseOut)

      
        topicStep = height / uniqueTopics.length
        stepCounter = 0
        topicLoc = {}
        for(i = 0; i < uniqueTopics.length; i ++){
          temp = (topicStep * stepCounter) + 5
          
          topicLoc[uniqueTopics[i]] = temp
          stepCounter += 1
        }
        topicColumn = chapterSVG.append("g")
      
        topicColumn.selectAll(".topicCircle")
                    .data(uniqueTopics)
                    .enter()
                    .append("rect")
                    .attr("x", d =>{
                        return width - 20
                    })
                    .attr("y", d =>{
                        return topicLoc[d]   
                    })
                    .attr("width", 10)
                    .attr("height", 20)
                    .attr("fill", "lightblue")
                    .attr("stroke", "black")
                    .on("mouseover", topicMouseMove)
                    .on("mouseout", mouseOut)
        
        lines = chapterSVG.append("g")            
        

        for(i = 0; i < chapters.length; i ++){
          let chapterId = chapters[i].woaii_chapter
          let topicList = data[chapterId]
          keys = Object.keys(topicList)
          for(j = 0; j < keys.length; j ++){
            key = keys[j]
            leftX = 10
            rightX = width - 20

            leftY = chapters[i].y
            rightY =  topicLoc[key]
          }
        }
    })


    const tooltip = chapterSVG.append('text')
                    .attr("class", "tooltip")
                    .attr("fill", "black")
                    .style("pointer-events", "none")
                    .style("font-size", "20px");

    function mouseMove(event, p){
      // https://observablehq.com/@john-guerra/how-to-add-a-tooltip-in-d3
      
      const [mx, my] = d3.pointer(event)
      
      tooltip
          .attr('x', mx)
          .attr('y', my)
          .text(p.chapter_title)
          .style("text-anchor", "start")
    }
    function mouseOut(event, p){
      // https://observablehq.com/@john-guerra/how-to-add-a-tooltip-in-d3
      tooltip.text("")
      
    }

    function topicMouseMove(event, p){
      const [mx, my] = d3.pointer(event)
      
      tooltip
      .attr('x', mx)
      .attr('y', my)
      .text(p)
      .style("text-anchor", "end")
      
    }
    
    
}



 function makeChapterLinks(coreData, chapters) {
  jsonName = "chaptersTopics.json"

  result = d3.json("./data/" + jsonName).then( data => {
    if(data == undefined){
      topicsDict = toDict(topics)
      links = makeLinks(coreData, chapters, topicsDict)
      return links
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
            //result = element.display_name
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
let nodes = null
let links = null
let node = null
let link = null

function makeNetwork(){
    
    const networkToolbar = networkSvg.append("div")
    
    const networkGraph = networkSvg.append("svg")
    networkGraph.attr("width", 900)
    networkGraph.attr("height", 332)    

    
    let titleWrapper = networkToolbar.append("div")
    titleWrapper.attr("class", "titleWrapper ")
    titleWrapper.append("div").text("Seed Title").style("font-weight", "bold")
    titleWrapper.append("div")
        .attr("id", "networkTitle")
        .style("fill", "black")
        .text("No seed paper selected")

    networkToolbar.append("button")
        .text("Display Network")
        .attr("id", "networkButton")
        .style("fill", "black")
        .style('text-anchor', "middle")
        .on("click", () => {
            updateNetwork(currentData)
        })
        .style("cursor", "pointer")    

    networkGraph.attr('id', "networkGraph")

    link = d3.select("#networkGraph").append("g")
    link.attr("id", "networkLinks")

    node = d3.select("#networkGraph").append("g")
    node.attr("id", "networkNodes")
    
    
        
    /*seedPrompt = networkGraph.append("text")
    seedPrompt.attr("id", "seedPrompt")
    if(seedArticle === null){
        
        seedPrompt.text("No seed selected. Selected a seed in the list to start")
    }*/
    
}

function updateNetwork(data){
    //let link = null
    
    if(seedArticle === null){
        alert("No seed selected")
    }
    else if(seedArticle.referenced_works.length === 0){
        alert("No related works found")
    }
    else{
        
        link.selectAll("*").remove()
        node.selectAll("*").remove()

        d3.select("#seedPrompt").style("display", "none")
        
        links = makeLinks(seedArticle.id, seedArticle.referenced_works, true)
        nodes = makeNodes(seedArticle.referenced_works.concat(seedArticle.id))
        //https://observablehq.com/@d3/force-directed-graph/2
        //links = makeLinks(seedArticle.id, seedArticle.related_works, true)
        //nodes = makeNodes(seedArticle.related_works.concat(seedArticle.id))
        ids = data.map(d => d.id)
        
        
        link.selectAll()
            .data(links)
            .join("line")
                .attr("stroke-width", d=> 1)
                .attr("stroke", "black")
                //.attr("x1", d => d.source.x)
                //.attr("y1", d => d.source.y)
                //.attr("x2", d => d.target.x)
                //.attr("y2", d => d.target.y)

        
        node.attr("stroke", "black")
        node.selectAll()
            .data(nodes)
            .join("circle")
            .attr("r", 7)
            .attr("fill", d => {
                if(d.id == seedArticle.id){
                    return "blue"
                }
                else if(ids.includes(d.id)){
                    return "green"
                }
                else{
                    return "red"
                }
            })
            .on("click", d => {
                console.log(d)
                clicked(d.target.__data__.id)
            }
            )
            .style("cursor", "pointer")
            /*.call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))*/
            .append("title")
                .text(d=> d.id)

        const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d) => d.id))
        //.force("charge", d3.forceLink(links).distance(100))
        .force("charge", d3.forceManyBody().strength(-40))
        .force("collide", d3.forceCollide().radius(10))
        .force("center", d3.forceCenter(900 / 2, 372 / 2))
        .on("tick",ticked)
        
        


        function dragstarted(event){
            if(!event.active) simulation.alphaTarget(0.3).restart()
            event.subject.fx = event.subject.x
            event.subject.fy = event.subject.y
        }
        
        function dragged(event){
            event.subject.fx = event.x
            event.subject.fy = event.y
        }
        
        function dragended(event){
            event.subject.fx = null
            event.subject.fy = null
        }

        
    }
    
}

function clicked(urlLink){
    
    // https://stackoverflow.com/questions/4907843/open-a-url-in-a-new-tab-and-not-a-new-window
    window.open(urlLink, "_blank").focus()
}

function ticked(){
    link.selectAll("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
    node.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
    /*
    link.selectAll("line")
        .data(links)
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)*/
}

function makeLinks(seedNode, destNodes, isBackwards){
    if(isBackwards){
        let result = new Array(destNodes.length)
        for(i = 0; i < destNodes.length; i ++){
            result[i] = {source: destNodes[i], target: seedNode} 
        }
        return result
    }else{

    }
}

function makeNodes(nodes){
    return nodes.map((element) =>{ return {id: element}})

}



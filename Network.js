let nodes = null
let links = null
let node = null
let link = null

function makeNetwork(){
    
    const networkToolbar = networkSvg.append("div")
    
    const networkGraph = networkSvg.append("svg")
    networkGraph.attr("width", 900)
    networkGraph.attr("height", 332)    

    //Create a header bar that will provide info to the user about the network. 
    //This will change when the user selects the "set seed" button in the article list
    let titleWrapper = networkToolbar.append("div")
    titleWrapper.attr("class", "titleWrapper ")
    titleWrapper.append("div").text("Seed Title").style("font-weight", "bold")
    titleWrapper.append("div")
        .attr("id", "networkTitle")
        .style("fill", "black")
        .text("No seed paper selected")

    networkToolbar.append("button") //When the button is clicked, display the network
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
    
}

function updateNetwork(data){
    //let link = null
    
    //Check if the seeds are valid
    if(seedArticle === null){
        alert("No seed selected")
    }
    else if(seedArticle.referenced_works.length === 0){ 
        alert("No related works found")
    }
    else{
        //clean up the network
        link.selectAll("*").remove()
        node.selectAll("*").remove()

        d3.select("#seedPrompt").style("display", "none") //hide the prompt
        
        //get a list of links from the referenced works to the seed article
        links = makeNetworkLinks(seedArticle.id, seedArticle.referenced_works, true) 

        //make all the nodes for the networks
        nodes = makeNodes(seedArticle.referenced_works.concat(seedArticle.id))
        //https://observablehq.com/@d3/force-directed-graph/2
        ids = data.map(d => d.id)
        
        //Customize the links for the network
        link.selectAll()
            .data(links)
            .join("line")
                .attr("stroke-width", d=> 1)
                .attr("stroke", "black")
        
        //customize the nodes for the network    
        node.attr("stroke", "black")
        node.selectAll()
            .data(nodes)
            .join("circle")
            .attr("r", 7)
            .attr("fill", d => {
                if(d.id == seedArticle.id){ //if the node is the seed, fill blue
                    return "blue"
                }
                else if(ids.includes(d.id)){ //if the node is the dataset, fill green
                    return "green"
                }
                else{ //otherwise fill red
                    return "red"
                }
            })
            .on("click", d => { //If the user clicks on the node, open up a tab to the OpenAlex webpage for that article
                
                clicked(d.target.__data__.id)
            }
            )
            .style("cursor", "pointer")
            .append("title")
                .text(d=> d.id)
        
        //Provide forces for the nodes
        const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d) => d.id))
        .force("charge", d3.forceManyBody().strength(-40))
        .force("collide", d3.forceCollide().radius(10))
        .force("center", d3.forceCenter(900 / 2, 372 / 2))
        .on("tick",ticked)
        
        
    }
    
}

function clicked(urlLink){
    
    // https://stackoverflow.com/questions/4907843/open-a-url-in-a-new-tab-and-not-a-new-window
    window.open(urlLink, "_blank").focus()
}

//Move the nodes each tick
function ticked(){
    link.selectAll("line")
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
    node.selectAll("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
}

function makeNetworkLinks(seedNode, destNodes, isBackwards){
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



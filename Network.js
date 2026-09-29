let nodes = null
let links = null
let node = null
let link = null
let networkTooltip = null
let networkTheme = null

function makeNetwork(){
    // Reuse the shared CSS palette so this SVG remains visually consistent
    // with the surrounding RéciTAC-inspired interface.
    const rootStyle = getComputedStyle(document.documentElement)
    const cssColor = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback
    networkTheme = {
        panel: cssColor("--panel-background", "#fdfdfd"),
        tooltip: cssColor("--panel-header-background", "#f6eee7"),
        text: cssColor("--primary-text", "#3f465a"),
        mutedStroke: cssColor("--muted-link-stroke", "#c6cdd3"),
        primaryAccent: cssColor("--primary-accent", "#2f8f6b"),
        secondaryAccent: cssColor("--secondary-accent", "#ae9176"),
        selected: cssColor("--selected-background", "#dff2ea")
    }
    
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

    // A lightweight SVG tooltip replaces the browser-native title bubble while
    // keeping the same OpenAlex identifier as its content.
    networkTooltip = d3.select("#networkGraph").append("g")
        .attr("id", "networkTooltip")
        .style("pointer-events", "none")
        .style("opacity", 0)

    networkTooltip.append("rect")
        .attr("height", 30)
        .attr("rx", 7)
        .attr("ry", 7)
        .attr("fill", networkTheme.tooltip)
        .attr("stroke", networkTheme.secondaryAccent)
        .attr("stroke-width", 1)

    networkTooltip.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("fill", networkTheme.text)
        .style("font-size", "12px")
        .style("font-weight", 600)
    
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
                .attr("stroke", networkTheme.mutedStroke)
                .attr("stroke-linecap", "round")
                .style("opacity", 0.55)
        
        function nodeType(d) {
            if(d.id == seedArticle.id) return "seed"
            if(ids.includes(d.id)) return "local"
            return "external"
        }

        function nodeFill(d) {
            const type = nodeType(d)
            if(type === "seed") return networkTheme.primaryAccent
            if(type === "local") return networkTheme.selected
            return networkTheme.tooltip
        }

        function nodeStroke(d) {
            return nodeType(d) === "local"
                ? networkTheme.primaryAccent
                : networkTheme.secondaryAccent
        }

        function nodeStrokeWidth(d) {
            if(nodeType(d) === "seed") return 2.5
            if(nodeType(d) === "local") return 1.5
            return 1.25
        }

        function endpointId(endpoint) {
            return typeof endpoint === "object" ? endpoint.id : endpoint
        }

        function linkIsIncident(networkLink, nodeId) {
            return endpointId(networkLink.source) === nodeId || endpointId(networkLink.target) === nodeId
        }

        function positionTooltip(event, d) {
            const tooltipWidth = Math.min(360, Math.max(170, d.id.length * 6.4 + 20))
            const [pointerX, pointerY] = d3.pointer(event, d3.select("#networkGraph").node())
            const x = Math.max(8, Math.min(900 - tooltipWidth - 8, pointerX + 12))
            const y = Math.max(8, Math.min(332 - 38, pointerY - 38))

            networkTooltip
                .attr("transform", `translate(${x}, ${y})`)
                .style("opacity", 1)
            networkTooltip.select("rect").attr("width", tooltipWidth)
            networkTooltip.select("text").text(d.id)
        }

        function emphasizeNode(event, d) {
            positionTooltip(event, d)

            // Force-link endpoints become node objects after initialization;
            // endpointId handles both that state and the initial string IDs.
            link.selectAll("line")
                .attr("stroke", networkLink => linkIsIncident(networkLink, d.id)
                    ? networkTheme.primaryAccent
                    : networkTheme.mutedStroke)
                .attr("stroke-width", networkLink => linkIsIncident(networkLink, d.id) ? 2 : 1)
                .style("opacity", networkLink => linkIsIncident(networkLink, d.id) ? 0.9 : 0.16)

            node.selectAll("circle")
                .style("opacity", networkNode => networkNode.id === d.id ? 1 : 0.5)
                .attr("stroke", networkNode => networkNode.id === d.id
                    ? networkTheme.text
                    : nodeStroke(networkNode))
                .attr("stroke-width", networkNode => networkNode.id === d.id
                    ? 3
                    : nodeStrokeWidth(networkNode))
                .style("filter", networkNode => networkNode.id === d.id
                    ? "drop-shadow(0 0 4px rgba(47, 143, 107, 0.40))"
                    : nodeType(networkNode) === "seed"
                        ? "drop-shadow(0 1px 3px rgba(63, 70, 90, 0.24))"
                        : "none")
        }

        function restoreNetworkStyles() {
            networkTooltip.style("opacity", 0)
            link.selectAll("line")
                .attr("stroke", networkTheme.mutedStroke)
                .attr("stroke-width", 1)
                .style("opacity", 0.55)
            node.selectAll("circle")
                .style("opacity", 1)
                .attr("stroke", nodeStroke)
                .attr("stroke-width", nodeStrokeWidth)
                .style("filter", d => nodeType(d) === "seed"
                    ? "drop-shadow(0 1px 3px rgba(63, 70, 90, 0.24))"
                    : "none")
        }

        //customize the nodes for the network
        node.selectAll()
            .data(nodes)
            .join("circle")
            .attr("r", 7)
            .attr("data-node-type", nodeType)
            .attr("data-openalex-id", d => d.id)
            .attr("fill", nodeFill)
            .attr("stroke", nodeStroke)
            .attr("stroke-width", nodeStrokeWidth)
            .style("filter", d => nodeType(d) === "seed"
                ? "drop-shadow(0 1px 3px rgba(63, 70, 90, 0.24))"
                : "none")
            .on("mouseover", emphasizeNode)
            .on("mousemove", positionTooltip)
            .on("mouseout", restoreNetworkStyles)
            .on("click", d => { //If the user clicks on the node, open up a tab to the OpenAlex webpage for that article
                
                 clicked(d.target.__data__.id)
            }
            )
            .style("cursor", "pointer")
        
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



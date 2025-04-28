function readHierachy(fileName){
    
    //https://observablehq.com/@d3/d3-stratify
    psv = d3.dsvFormat('|') //csv delimiter
    const result = d3.text(fileName).then(t =>{
        data = psv.parse(t)
        childCol = data.columns[0]
        parentCol = data.columns[1]
         root = d3.stratify()
                    .id(d => d[childCol])
                    .parentId(d => d[parentCol])(data)
        
        
        return root;
    })

    
    return result
    
}

function readCSV(fileName, delim){
    csv = d3.dsvFormat(delim)
    const result = d3.text(fileName).then(t=>{
        return csv.parse(t)
    })
    return result
}

function readOpenAlex(fileName){
    const data = d3.json(fileName)
    return data
}
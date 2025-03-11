function readHierachy(fileName){
    
    //https://observablehq.com/@d3/d3-stratify
    psv = d3.dsvFormat('|') //csv delimiter
    const result = d3.text(fileName).then(t =>{
        data = psv.parse(t)
        childCol = data.columns[0]
        parentCol = data.columns[1]
        /*
        stratify = d3.stratify()
                    .id(data => data[childCol])
                    .parentId(data => data[parentCol])
        const root = stratify(data)*/
         root = d3.stratify()
                    .id(d => d[childCol])
                    .parentId(d => d[parentCol])(data)
        
        
        return root;
    })

    
    return result
    
}

function readOpenAlex(fileName){
    const data = d3.json(fileName)
    return data
}
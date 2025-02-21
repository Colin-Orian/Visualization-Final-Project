function readHierachy(fileName){
    result = null
    //https://observablehq.com/@d3/d3-stratify
    psv = d3.dsvFormat('|') //csv delimiter
    const fileContent = d3.text(fileName).then(t =>{
        data = psv.parse(t)
        console.log(data)
        childCol = data.columns[0]
        parentCol = data.columns[1]
        stratify = d3.stratify()
                    .id(data => data[childCol])
                    .parentId(data => data[parentCol])
        const root = stratify(data)
        console.log(root)
    })
    
    // table = d3.csv(fileName)

    // table.then((t) => {
    //     console.log(t)
    //     childCol = t.columns[0]
    //     parentCol = t.columns[1]
    //     console.log(childCol)
    //     console.log(parentCol)
    //     stratify = d3.stratify()
    //                .id(t => t[childCol])
    //                .parentId(t => t[parentCol])
        
    //     const root = stratify(t)
    //     console.log(root)
    //     result = root
    // })
    
    return result;
}
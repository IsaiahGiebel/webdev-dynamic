import * as fs from 'node:fs'
import * as path from 'node:path';
import * as http from 'node:http';
import * as url from 'node:url';
import {default as express} from 'express';
import {default as sqlite3} from 'sqlite3';

const port=8000;
const __dirname= path.dirname(url.fileURLToPath(import.meta.url));
const root=path.join(__dirname,'public');
const template = path.join(__dirname,'templates');

let app=express();
app.use(express.static(root));

const db = new sqlite3.Database(path.join(__dirname,'candy.sqlite3'),sqlite3.OPEN_READONLY, (err)=>{
    if(err){
        console.log('Error connecting to database');
    }
    else{
        console.log('Successfully connected to database');
    }});

function dbSelect(query,params){
    let p = new Promise((resolve, reject)=>{
        db.all(query, params, (err,rows)=>{
            if (err){
                reject(err);
            }
            else{
                resolve(rows);
            }
        });
    });
    return p;
}   


app.get('/', (req, res) => {
    // Send the index.html file for the home page
    res.sendFile(path.join(template, 'index.html'), 'utf-8');
});

//function to convert 1 and 0 to yes and no for table data displayed on web page
function convertToYesNo(value) {
    return value ? 'Yes' : 'No';
}

//makes candy names readable as files
function slugify(text) {
    return text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')           
                                        // ^^^Replace spaces with -   ^^^Remove non letter characters
  }
  

//SUGAR PERCENT
app.get('/sugarpercent/:category', (req, res) => {

    let category = req.params.category;
    let sugarMin;
    let sugarMax;
    let categoryLess;
    let categoryMore;
    if (category != 'low' && category != 'medium' && category !='high'){
        res.status(404).send("Error: " +category+" is not a valid range");
    }
    switch (category) {
        case 'low':
            sugarMin = 0;
            sugarMax = 0.3;
            categoryLess='low'
            categoryMore='medium'
            break;
        case 'medium':
            sugarMin = 0.3
            sugarMax = 0.6;
            categoryLess='low'
            categoryMore='high'
            break;
        case 'high':
            sugarMin = 0.6
            sugarMax = 1;
            categoryLess='medium'
            categoryMore='high'
            break;
    }


    let p1 = dbSelect('SELECT * FROM candy WHERE sugarpercent < ? AND sugarpercent >= ? ORDER BY sugarpercent',[sugarMax,sugarMin]);
    let p2 = fs.promises.readFile(path.join(template, 'sugarpercent.html'), 'utf-8');

    Promise.all([p1, p2]).then(results => {
        let template = results[1];
        let response = template.replaceAll('$$CATEGORY_NAME$$', category);
        response = response.replaceAll('$$CATEGORY_LESS$$', categoryLess);
        response = response.replaceAll('$$CATEGORY_MORE$$',categoryMore);
 
            
        //for making the barchart
        let chocolateCount = 0;
        let fruityCount = 0;
        let nuttyCount = 0;
        let caramelCount = 0;
        let otherCount = 0;
        
        let table_body = results[0].map((candy,index) => {

            //for making the barchart
            if (candy.chocolate) chocolateCount++;
            if (candy.fruity) fruityCount++;
            if (candy.peanutyalmondy) nuttyCount++;
            if (candy.caramel) caramelCount++;
            if (!candy.chocolate && !candy.fruity && !candy.peanutyalmondy && !candy.caramel){
                otherCount++;
            }

            const imageName = slugify(candy.competitorname) + '.jpg';
            const imagePath = `/images/${imageName}`;
            const imageTag = index === 0 ? `<img src="${imagePath}" alt="Image of ${candy.competitorname}" style="max-width:10rem;max-height:6rem;">` : '';
            response = response.replace('$$FEATURED_IMAGE$$', imageTag);
            response = response.replace('$$IMAGE_CAPTION$$', candy.competitorname);
            return `<tr>
                <td>${candy.competitorname}</td>
                <td>${parseFloat(candy.sugarpercent).toFixed(2)+'%'}</td>
                <td>${convertToYesNo(candy.chocolate)}</td>
                <td>${convertToYesNo(candy.fruity)}</td>
                <td>${convertToYesNo(candy.peanutyalmondy)}</td>
                <td>${convertToYesNo(candy.caramel)}</td>
                <td>${convertToYesNo(!candy.chocolate && !candy.fruity && !candy.peanutyalmondy && !candy.caramel)}</td>
            </tr>`;
        }).join('');//join all strings into one

        response = response.replaceAll('$$CHOCOLATE_COUNT$$', chocolateCount)
                           .replaceAll('$$FRUITY_COUNT$$', fruityCount)
                           .replaceAll('$$NUTTY_COUNT$$', nuttyCount)
                           .replaceAll('$$CARAMEL_COUNT$$', caramelCount)
                           .replaceAll('$$OTHER_COUNT$$', otherCount);

        response = response.replaceAll('$$TABLE_BODY$$', table_body);        

        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.error(error);
        res.status(500).send("An error occurred on the server.");
    });
});


//WIN PERCENT
app.get('/winpercent/:category', (req, res) => {

    let category = req.params.category;
    let winMin;
    let winMax;
    let categoryLess;
    let categoryMore;
    if (category != 'low' && category != 'medium' && category !='high'){
        res.status(404).send("Error: " +category+" is not a valid range");
    }
    switch (category) {
        case 'low':
            winMin = 0;
            winMax = 40;
            categoryLess='low'
            categoryMore='medium'
            break;
        case 'medium':
            winMin = 40
            winMax = 55;
            categoryLess='low'
            categoryMore='high'
            break;
        case 'high':
            winMin = 55
            winMax = 100;
            categoryLess='medium'
            categoryMore='high'
            break;
    }
    let p1 = dbSelect('SELECT * FROM candy WHERE winpercent < ? AND winpercent >= ? ORDER BY winpercent DESC',[winMax,winMin]);
    let p2 = fs.promises.readFile(path.join(template, 'winpercent.html'), 'utf-8');

    Promise.all([p1, p2]).then(results => {
        let template = results[1];
        let response = template.replaceAll('$$CATEGORY_NAME$$', category);
        response = response.replaceAll('$$CATEGORY_LESS$$', categoryLess);
        response = response.replaceAll('$$CATEGORY_MORE$$',categoryMore);
 
            
        //for making the barchart
        let chocolateCount = 0;
        let fruityCount = 0;
        let nuttyCount = 0;
        let caramelCount = 0;
        let otherCount = 0;
        
        let table_body = results[0].map((candy,index) => {

            //for making the barchart
            if (candy.chocolate) chocolateCount++;
            if (candy.fruity) fruityCount++;
            if (candy.peanutyalmondy) nuttyCount++;
            if (candy.caramel) caramelCount++;
            if (!candy.chocolate && !candy.fruity && !candy.peanutyalmondy && !candy.caramel){
                otherCount++;
            }

            const imageName = slugify(candy.competitorname) + '.jpg';
            const imagePath = `/images/${imageName}`;
            const imageTag = index === 0 ? `<img src="${imagePath}" alt="Image of ${candy.competitorname}" style="max-width:10rem;max-height:6rem;">` : '';
            response = response.replace('$$FEATURED_IMAGE$$', imageTag);
            response = response.replace('$$IMAGE_CAPTION$$', candy.competitorname);
            return `<tr>
                <td>${candy.competitorname}</td>
                <td>${parseFloat(candy.sugarpercent).toFixed(2)+'%'}</td>
                <td>${convertToYesNo(candy.chocolate)}</td>
                <td>${convertToYesNo(candy.fruity)}</td>
                <td>${convertToYesNo(candy.peanutyalmondy)}</td>
                <td>${convertToYesNo(candy.caramel)}</td>
                <td>${convertToYesNo(!candy.chocolate && !candy.fruity && !candy.peanutyalmondy && !candy.caramel)}</td>
            </tr>`;
        }).join('');//join all strings into one

        response = response.replaceAll('$$CHOCOLATE_COUNT$$', chocolateCount)
                           .replaceAll('$$FRUITY_COUNT$$', fruityCount)
                           .replaceAll('$$NUTTY_COUNT$$', nuttyCount)
                           .replaceAll('$$CARAMEL_COUNT$$', caramelCount)
                           .replaceAll('$$OTHER_COUNT$$', otherCount);

        response = response.replaceAll('$$TABLE_BODY$$', table_body); 
       
        res.status(200).type('html').send(response);
    }).catch((error) => {
        console.error(error);
        res.status(500).send(error);
    });
});


//PRICE PERCENT
app.get('/pricepercent/:category', (req, res) => {

    let category = req.params.category;
    let priceMin;
    let priceMax;
    let categoryLess;
    let categoryMore;
    if (category != 'low' && category != 'medium' && category !='high'){
        res.status(404).send("Error: " +category+" is not a valid range");
    }
    switch (category) {
        case 'low':
            priceMin = 0;
            priceMax = 0.3; 
            categoryLess='low'
            categoryMore='medium'
            break;
        case 'medium':
            priceMin = 0.3
            priceMax = 0.6; 
            categoryLess='low'
            categoryMore='high'
            break;
        case 'high':
            priceMin = 0.6
            priceMax = 1; 
            categoryLess='medium'
            categoryMore='high'
            break;
    }
    let p1 = dbSelect('SELECT * FROM candy WHERE pricepercent < ? AND pricepercent >= ? ORDER BY pricepercent',[priceMax,priceMin]);
    let p2 = fs.promises.readFile(path.join(template, 'pricepercent.html'), 'utf-8');

    Promise.all([p1, p2]).then(results => {
        let template = results[1];
        let response = template.replaceAll('$$CATEGORY_NAME$$', category);
        response = response.replaceAll('$$CATEGORY_LESS$$', categoryLess);
        response = response.replaceAll('$$CATEGORY_MORE$$',categoryMore);
 
            
        //for making the barchart
        let chocolateCount = 0;
        let fruityCount = 0;
        let nuttyCount = 0;
        let caramelCount = 0;
        let otherCount = 0;
        
        let table_body = results[0].map((candy,index) => {

            //for making the barchart
            if (candy.chocolate) chocolateCount++;
            if (candy.fruity) fruityCount++;
            if (candy.peanutyalmondy) nuttyCount++;
            if (candy.caramel) caramelCount++;
            if (!candy.chocolate && !candy.fruity && !candy.peanutyalmondy && !candy.caramel){
                otherCount++;
            }

            const imageName = slugify(candy.competitorname) + '.jpg';
            const imagePath = `/images/${imageName}`;
            const imageTag = index === 0 ? `<img src="${imagePath}" alt="Image of ${candy.competitorname}" style="max-width:10rem;max-height:6rem;">` : '';
            response = response.replace('$$FEATURED_IMAGE$$', imageTag);
            response = response.replace('$$IMAGE_CAPTION$$', candy.competitorname);
            return `<tr>
                <td>${candy.competitorname}</td>
                <td>${parseFloat(candy.sugarpercent).toFixed(2)+'%'}</td>
                <td>${convertToYesNo(candy.chocolate)}</td>
                <td>${convertToYesNo(candy.fruity)}</td>
                <td>${convertToYesNo(candy.peanutyalmondy)}</td>
                <td>${convertToYesNo(candy.caramel)}</td>
                <td>${convertToYesNo(!candy.chocolate && !candy.fruity && !candy.peanutyalmondy && !candy.caramel)}</td>
            </tr>`;
        }).join('');//join all strings into one

        response = response.replaceAll('$$CHOCOLATE_COUNT$$', chocolateCount)
                           .replaceAll('$$FRUITY_COUNT$$', fruityCount)
                           .replaceAll('$$NUTTY_COUNT$$', nuttyCount)
                           .replaceAll('$$CARAMEL_COUNT$$', caramelCount)
                           .replaceAll('$$OTHER_COUNT$$', otherCount);

        response = response.replaceAll('$$TABLE_BODY$$', table_body); 
       
        res.status(200).type('html').send(response); 
    }).catch((error) => {
        console.error(error);
        res.status(500).send("An error occurred on the server.");
    });
});


app.listen(port, () =>{
    console.log('Now listening on port'+port);
});

function graphDraw(names, values) {

    var graphtrace = {
        type: 'scatter',
        x: names,
        y: values,
        mode: 'markers',
        name: '',
        marker: {
            color: 'rgb(255, 0, 0)',
            line: {
                color: 'rgb(0,0,255)',
                width: 1,
            },
            symbol: 'circle',
            size: 16
        }
    };

    var layout = {
        title: 'Candy Graph',
        xaxis: {
            showgrid: false,
            showline: true,
            linecolor: 'rgb(102, 102, 102)',
            titlefont: {
                font: {
                    color: 'rgb(204, 204, 204)'
                }
            },
            tickfont: {
                font: {
                    color: 'rgb(102, 102, 102)'
                }
            },
            autotick: false,
            dtick: 10,
            ticks: 'outside',
            tickcolor: 'rgb(102, 102, 102)'
        },
        margin: {
            l: 140,
            r: 40,
            b: 50,
            t: 80
        },
        legend: {
            font: {
                size: 10,
            },
            yanchor: 'middle',
            xanchor: 'right'
        },
        width: 600,
        height: 600,
        paper_bgcolor: 'rgb(254, 247, 234)',
        plot_bgcolor: 'rgb(254, 247, 234)',
        hovermode: 'closest'
    };

    return Plotly.newPlot("myGraph", graphtrace, layout);
};
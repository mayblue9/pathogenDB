/* handle event 
 * */
function parseDataForDC(preData) {
    var data = [];
	for (var k in preData){
		if (preData.hasOwnProperty(k)){
			var datum = preData[k];
			for (var i = 0, max = datum.length; i < max; i += 1){
				data = data.concat(datum[i]);
			}
		}
	}
    return data;
}

var data = parseDataForDC(oriData); // decide location of this variable !!

$('.exp').css('cursor', 'help');
$('.exp').tooltip({show: {effect:'Fade', duration:10}});
$('.row').css('margin-top','10px');
$(document).ready(function(){
	for (var k in indexToSample){
		if (indexToSample.hasOwnProperty(k)){
			var v = indexToSample[k];
			$('#sortable').append('<div class="btn ui-state-default">'+ 
				v +'</div>');
		}
	}
	$('#sortable').sortable();
	$('#sortable').disableSelection();
	$('#apply-sorting').click(function (){
		var order = [];
		$('#sortable').children().each(function () {
			order.push($(this).text());
		});

		// update "indexToSample", "sampleToIndex"
		for (var i = 0, max = order.length; i < max; i += 1) {
			indexToSample[i] = order[i];
			sampleToIndex[order[i]]	= i;
		}
		// update Chart
		speciesPerSampleBarChart.x(d3.scale.ordinal().domain(order));
		lineChart.x(d3.scale.ordinal().domain(order));
		dc.redrawAll();
	});
});


/* functions
 */
function shuffle (data) {
	for (var j, x, i = data.length; i; j = Math.floor(Math.random() * i), x = data[--i], data[i] = data[j], data[j] = x);

}
function makeColors (colorbrewer, count) {
	var refColors;
	for (var i = 0, max = colorbrewer.length; i < max; i += 1){
		refColors = colorbrewer[i];
		if (count < refColors.length) {
			break;
		}
	}
	var colors = [];
	if (count > refColors.length) {
		var mul = Math.ceil(count/refColors.length);
		for (var i = 1; i < mul; i+= 1){
			colors.concat(refColors);
		}
		colors = shuffle(colors);
	} else {
		count += 2;
		var gap = Math.floor(refColors.length/count);
		var accum = gap;
		for (var i = 0; i < count; i += 1){
			colors.push(refColors[accum]);
			accum += gap;
		}
	}
	return colors;
}


/* variables 
 * */
var topGenusCount = 5,
	topSpeciesCount = 7,

	samplePieChart = dc.pieChart('#sample-pie-chart'),
	genusPieChart = dc.pieChart('#genus-pie-chart'),
	speciesPieChart = dc.pieChart('#species-pie-chart'),
	speciesPerSampleBarChart = dc.barChart('#sample-stack-chart'),
	lineChart = dc.lineChart('#sample-line-chart'),

	microbiome = crossfilter(data),
	all = microbiome.groupAll(),

	sampleDim = microbiome.dimension(function (d) {
		return d.sample;
	}),
	sampleDimGroup = sampleDim.group().reduceSum( function (d){
		return d.count;
	}),
	indexToSample = {},
	sampleToIndex = {},

	genusDim = microbiome.dimension(function (d){
		return d.genus;    
	}),                    
	genusDimGroup = genusDim.group().reduceSum(function (d) {
		return d.count;
	}),
	speciesDim = microbiome.dimension(function (d){
		return d.species;
	}),
	speciesDimGroup = speciesDim.group().reduceSum(function (d) {
		return d.count;
	}),

	topSpecies = speciesDimGroup.top(topSpeciesCount),
	topSpeciesName = [],

	speciesPerSamples = [],
	speciesPerSamples2 = [];

/* populate variables 
 * */
for (var i = 0, max = topSpecies.length; i < max; i +=1 ){
	topSpeciesName.push(topSpecies[i].key);
}

function getSampleDimGroupByType(rank, types, exclude) {
	var group = sampleDim.group().reduceSum( function (d) {
			if ((exclude === true) && (types.indexOf(d[rank]) === -1)){
				return d.count;
			} else if ((exclude === false) && (types.indexOf(d[rank]) > -1)){
				return d.count;
			} else {
				return 0;
			}
	});
	group.all = function(){
		var result = [];
		var tt = {};
		var ref = group.top(Infinity);
		for (var i = 0, max = ref.length; i < max; i+= 1){
			var sampleName = ref[i].key;
			var index = sampleToIndex[sampleName];
			tt[index] = ref[i];
		}
		for (var i = 0, max = ref.length; i < max; i += 1){
			result.push(tt[i]);
		}
		return result;
	}
	return group;
}

for (var i = 0, max = topSpeciesName.length; i < max; i += 1){
	var species = topSpeciesName[i];
	var value = getSampleDimGroupByType('species', [species], false);
	speciesPerSamples.push( {'key':species, 'value': value} );
}

speciesPerSamples.push({'key': 'etc', 'value': 
		getSampleDimGroupByType('species', topSpeciesName, true)});

for (var i=0, max=sampleDimGroup.all().length; i < max; i += 1){
	var t = sampleDimGroup.all()[i];
	indexToSample[i] = t.key;
	sampleToIndex[t.key] = i;
}

/* draw chart 
 * */
samplePieChart
	.width(200)
	.height(200)
	.radius(90)
	.innerRadius(20)
	.dimension(sampleDim)
	.group(sampleDimGroup)
	.label(function (d) {
		return d.data.key;
	})
	.valueAccessor(function(d){
		return d.value;
	});

genusPieChart
	.width(200)        
	.height(200)       
	.radius(90)
	.colors(makeColors (colorbrewer, genusDimGroup.size()))
	.dimension(genusDim)
	.group(genusDimGroup);

speciesPieChart
	.width(200)        
	.height(200)       
	.radius(90)        
	.dimension(speciesDim)
	.group(speciesDimGroup)
	.colors(makeColors (colorbrewer, speciesDimGroup.size()));

speciesPerSampleBarChart
	.width(790)
	.height(300)
	.margins({top:20, right:20, bottom:30, left:50})
	.dimension(sampleDim)
	.colors( makeColors(colorbrewer, speciesPerSamples.length + 1 ))
	.group(speciesPerSamples[0]['value'], speciesPerSamples[0]['key'])
	.valueAccessor(function(p) {
		return p.value;
	});

for (var i = 1, max = speciesPerSamples.length; i < max; i+=1){
	var comp = speciesPerSamples[i];
	speciesPerSampleBarChart.stack(comp['value'], comp['key']);
}
speciesPerSampleBarChart
	.x(d3.scale.ordinal())
	.xUnits(dc.units.ordinal)
	.elasticX(true)
	.elasticY(true)
	.centerBar(true)
	.gap(5)
	.renderHorizontalGridLines(true)
	.title(function(d){
		return d.y;
	});

lineChart
	.renderArea(true)
	.xUnits(dc.units.ordinal)
	.width(790)
	.height(300)
	.margins({top:20, right:20, bottom:30, left:50})
	.dimension(sampleDim)
	.colors( makeColors( speciesPerSamples.length + 1 ))
	.valueAccessor(function(p){
		return p.value;
	})
	.group(speciesPerSamples[0]['value'], speciesPerSamples[0]['key']);
for (var i = 1, max = speciesPerSamples.length; i < max; i+=1){
	var comp = speciesPerSamples[i];
	lineChart.stack(comp['value'], comp['key']);
}

lineChart
	.renderHorizontalGridLines(true)
	.x(d3.scale.ordinal())
	.xUnits(dc.units.ordinal)
	.elasticX(true)
	.elasticY(true);


dc.renderAll();


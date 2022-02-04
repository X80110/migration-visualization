// TODO JAN 12 2022
// !!  - gender data
//      - label orientation
//           - country
//           - south pole
//      - unify filtering
//      - tooltips
//      - flow map
//      - tweens and transitions


// MAIN SETTINGS AND HELPERS
// Canvas
var width = 550;
var height = width;
const textId = "O-text-1"; 

// Define
var innerRadius = Math.min(width, height) *0.5-25;
var outerRadius = innerRadius + 10;
const chordDiagram = d3.select("#chart")
    .append("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height]);



// Standard chord settings    
// var chord = d3.chordDirected()
//     .padAngle(1 / innerRadius)
//     .sortSubgroups(d3.descending)
//     .sortChords(d3.descending);


// var arc = d3.arc() 
//     .innerRadius(innerRadius)
//     .outerRadius(outerRadius);
// var ribbon = d3.ribbonArrow()
//     .radius(innerRadius - 6)
//     .padAngle(1 / innerRadius);
var formatValue = x => `${x.toFixed(0).toLocaleString()}`;

// Set a matrix of the data data to pass to the chord() function
function getMatrix(names,data) {
    const index = new Map(names.map((name, i) => [name, i]));
    const matrix = Array.from(index, () => new Array(names.length).fill(0));

    for (const { source, target, value } of data) matrix[index.get(source)][index.get(target)] += value;
        return matrix;
}

//--------------------------------//
//       GET & PREPARE DATA       //
//--------------------------------//
////// DIAGRAM DATA STUCUTRE
// optimal data structure = { matrix: [ {
    //                           year0: {
    //                              dimension1: [values],
    //                              dimension2: [values]
    //                              ... },                                  --- source-target value for their relative index as specified in 'names'
    //                           year1: {
    //                              dimension1: [values],
    //                              dimension2: [values]
    //                              ... },  
//                               } ]                                        --- should we switch year-type to minimize headers for data groups? Years add up more easily than methods 
//                            names : [names],                              
//                            regions: [regions],                           --- regions index is positioned on head of their subcountries  
//                            dimensions: [dimension1,dimension2...]
//                            type: [dataset] }                             --- type are indexs in matix.value

const getData = async () => {
    try {
        // const raw_data = await d3.csv("gf_od.csv");
        // const metadata = await d3.csv("data/country-metadata-flags.csv");
        // output example json data structure in console
        const ref = await d3.json("json/migrations.json");
          console.log("JSON",ref)
        
        // let labels = metadata.map(d=>{ 
        //   let flag = d.origin_flag
        //   let country = d.origin_name
        //   let region =  d.originregion_name
        //   return {
        //       [d.origin_iso]:  d.origin_iso,
        //       iso :  d.origin_iso,
        //       sex :  d.sex,
        //       country: flag + " " + country ,
        //       region: region
        //   }
        // })
        // // console.log(raw_data)    
        // // console.log(labels)    
        // let result = raw_data.map(d=>{
        //     //        Replace SUDAN ISO CODE "SUD" -> "SDN"
        //     //                CHILE ISO CODE "CHI" -> "CHL"
        //     //                SERBIA AND MONTENEGRO ISO CODE "" -> "SCG"
        //     //                FINALLY SOLVED DIRECTLY IN CSV
        //     //        
        //     //        let origin = d.orig.replace("SUD","SDN")
        //     //        let destination = d.dest.replace("SUD","SDN")
        //     //
        //     //        Equivalent Vlookup or leftjoin labels <-> iso
        //     let origin = new Object(labels.filter(a=>a[d.orig])[0])
        //     let destination = new Object(labels.filter(a=>a[d.dest])[0])
        //     return{
        //         source :[ origin.iso, origin.country , origin.region],
        //         target : [ destination.iso, destination.country , destination.region],
        //         year : d.year0,
        //         sex : d.sex,
        //         values : ({
        //             mig_rate: +d.mig_rate,
        //             da_min_closed: +d.da_min_closed,
        //             da_min_open: +d.da_min_open,
        //             da_pb_closed: +d.da_pb_closed,
        //             sd_rev_neg: +d.sd_rev_neg,
        //             sd_drop_neg: +d.sd_drop_neg
        //             })
        //     }
        // }) 
        // data = {raw_data:result, ref: ref/* ,labels */}
        // data = { ref: ref/* ,labels */}
        // return  data
        return  ref
    }
    catch (err) {
        console.log(err)
        throw Error("Failed to load data")
    }
}
  

getData().then((data)=>{ 

    // // INITIAL DATA INPUTS
    // const allYears = [...new Set(data.raw_data.map((d) => d.year))].reverse();
    // const allVars = ['mig_rate', 'da_min_closed', 'da_min_open','da_pb_closed', 'sd_rev_neg', 'sd_drop_neg']
    // const allGenders = ['male', 'female'].reverse()
    
    // let selectedYear = allYears[0] 
    // let selectedRegion = []
    // let selectedValues = 'mig_rate'
    // let selectedGender = 'female'
    // var raw_data = data.raw_data.flat()
    // // console.log("RAAWW!!",raw_data)
    // // CREATE SELECTORS
    // d3.select("#selectYear")
    //     .selectAll('myOptions')
    //     .data(allYears)
    //     .enter()
    //     .append('option')
    //     .text(d=>{ return d; })    // text showed in the menu dropdown
    //     .attr("value",d=> { return d; }) 
    
    // d3.select("#selectValues")
    //     .selectAll('myOptions')
    //     .data(allVars)
    //     .enter()
    //     .append('option')
    //     .text(d=>{ return d; })    // text showed in the menu dropdown
    //     .attr("value",d=> { return d; }) 

    // d3.select("#selectGender")
    //     .selectAll('myOptions')
    //     .data(allGenders)
    //     .enter()
    //     .append('option')
    //     .text(d=>{ return d; })    // text showed in the menu dropdown
    //     .attr("value",d=> { return d; }) 
   
    
    // // DRAW CHART
    // // draw(selectedYear,selectedRegion,selectedValues,selectedGender)    
    
    // // PREPARE DATA GIVEN SELECTED VALUES
    // function prepareData(year,region,values,sex) {
    //     // filter selected yeaar and values by regions (or country if a region is clicked)

    //     let selectedData = aq.from(raw_data)
    //         .orderby(d=>d.source[2] )
    //         .objects()
    //         .filter(d=> d.year === year && d.sex === sex)
            
    //         .map(d=> { 
    //         // d.source ---> [0] isocodes // [1] countrylabels // [2] region 
    //         return{
    //             // (if) d.source = selected region (then) d.source = country (else)  d.source = region
    //             source: d.source[2] === region ? d.source[1] : d.source[2],
    //             // same as before
    //             target: d.target[2] === region ? d.target[1] : d.target[2],
    //             value: +d.values[values],
    //             year: d.year,
    //             sex: d.sex,
    //     }})

    //     // slice low values
    //     selectedData = selectedData.filter(d=> d.target !=='none' && d.source !== 'none' && d.value > 100)
        
        
    //     // rollup by source <-> target
    //     // aq.from(selectedData).print()
    //     let groupedValues = aq.from(selectedData)
    //         .select('value','year','source','target','sex')
    //         .groupby('source','target','year','sex')
    //         .rollup( {value: d => op.sum(d.value)})
    //         .derive( {value: d => op.round(d.value) })       
    //         .objects()
    //     // console.log(groupedValues)

    //     // create graph structure for sankey
    //     let graph = () => {
    //         let keys = ["source", "target"]
    //         let index = -1;
    //         const nodes = [];
    //         const nodeByKey = new Map;
    //         const indexByKey = new Map;
    //         const links = [];
          
    //         for (const k of keys) {
    //           for (const d of groupedValues) {
    //             const key = JSON.stringify([k, d[k]]);
    //             if (nodeByKey.has(key)) continue;
    //             const node = {name: d[k]};
    //             nodes.push(node);
    //             nodeByKey.set(key, node);
    //             indexByKey.set(key, ++index);
    //           }
    //         }
          
    //         for (let i = 1; i < keys.length; ++i) {
    //           const a = keys[i - 1];
    //           const b = keys[i];
    //           const prefix = keys.slice(0, i + 1);
    //           const linkByKey = new Map;
    //           for (const d of groupedValues) {
    //             const names = prefix.map(k => d[k]);
    //             const key = JSON.stringify(names);
    //             const value = d.value || 1;
    //             let link = linkByKey.get(key);
    //             if (link) { link.value += value; continue; }
    //             link = {
    //               source: indexByKey.get(JSON.stringify([a, d[a]])),
    //               target: indexByKey.get(JSON.stringify([b, d[b]])),
    //               names,
    //               value
    //             };
    //             links.push(link);
    //             linkByKey.set(key, link);
    //           }
    //         }
          
    //         return {nodes, links};
    //     }

    //     let sankeyData = graph(groupedValues)
    //     // console.log(sankeyData)
    //     return {chord: groupedValues, sankey: sankeyData}
    // }




    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    var π = Math.PI,
      radians = π / 180,
      degrees = 180 / π;
      var d3_functor = d3.functor;
    // import "../core/source";
    function d3_source(d) {
      return d.source;
    }
    // import "../core/target";
    function d3_target(d) {
      return d.target;
    }
    // import "../math/trigonometry";
    var π = Math.PI;
    // import "arc";
    var d3_svg_arcOffset = -π / 2;
    function d3_svg_arcStartAngle(d) {
      return d.startAngle;
    }
    function d3_svg_arcEndAngle(d) {
      return d.endAngle;
    }
    
  //   chord = function() {
  //     // import "../core/functor";
  
  // // import "svg";


  //     var source = d3_source,
  //         target = d3_target,
  //         radius = d3_svg_chordRadius,
  //         sourcePadding = d3_svg_chordSourcePadding,
  //         targetPadding = d3_svg_chordTargetPadding,
  //         startAngle = d3_svg_arcStartAngle,
  //         endAngle = d3_svg_arcEndAngle;

  //     // TODO Allow control point to be customized.

  //     function chord(d, i) {
  //       var s = subgroup(this, source, d, i),
  //           t = subgroup(this, target, d, i, true);


  //       if (equals(s, t)) {
  //         s.a1 = s.a1 - (s.a1 - s.a0) / 2;
  //         s.p1 = [s.r * Math.cos(s.a1), s.r * Math.sin(s.a1)];

  //         t.a0 = t.a0 + (t.a1 - t.a0) / 2;
  //         t.p0 = [t.r * Math.cos(t.a0), t.r * Math.sin(t.a0)];
  //       }

  //       var ccp = cubic_control_points(s, t, s.r * 0.618);

  //       return "M" + s.p0
  //         + arc(s.r, s.p1, s.a1 - s.a0)
  //         + cubic_curve(ccp.cps1, ccp.cpt0, t.p0)
  //         + arc(t.r, t.p1, t.a1 - t.a0)
  //         + cubic_curve(ccp.cpt1, ccp.cps0, s.p0)
  //         + "Z";
  //     }

  //     function cubic_control_points(s, t, factor) {
  //       cps0 = [factor * Math.cos(s.a0), factor * Math.sin(s.a0)];
  //       cps1 = [factor * Math.cos(s.a1), factor * Math.sin(s.a1)];
  //       cpt0 = [factor * Math.cos(t.a0), factor * Math.sin(t.a0)];
  //       cpt1 = [factor * Math.cos(t.a1), factor * Math.sin(t.a1)];
  //       return {
  //         cps0: cps0, 
  //         cps1: cps1, 
  //         cpt0: cpt0, 
  //         cpt1: cpt1
  //       };
  //     }

  //     function subgroup(self, f, d, i, target) {
  //       var subgroup = f.call(self, d, i),
  //           r = radius.call(self, subgroup, i),
  //           a0 = startAngle.call(self, subgroup, i) + d3_svg_arcOffset,
  //           a1 = endAngle.call(self, subgroup, i) + d3_svg_arcOffset;
        
  //       if (target) {
  //         var d = targetPadding.call(self, subgroup, i) || 0;
  //         r = r - d;
  //       } else {
  //         var d = sourcePadding.call(self, subgroup, i) || 0;
  //         r = r - d;
  //       }

  //       return {
  //         r: r,
  //         a0: a0,
  //         a1: a1,
  //         p0: [r * Math.cos(a0), r * Math.sin(a0)],
  //         p1: [r * Math.cos(a1), r * Math.sin(a1)]
  //       };
  //     }

  //     function equals(a, b) {
  //       return a.a0 == b.a0 && a.a1 == b.a1;
  //     }

  //     function arc(r, p, a) {
  //       return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
  //     }

  //     function curve(r0, p0, r1, p1) {
  //       return "Q 0,0 " + p1;
  //     }

  //     function cubic_curve(cp0, cp1, p1) {
  //       return "C " + cp0 + " " + cp1 + " " + p1;
  //     }

  //     chord.radius = function(v) {
  //       if (!arguments.length) return radius;
  //       radius = d3_functor(v);
  //       return chord;
  //     };

  //     // null2
  //     chord.sourcePadding = function(v) {
  //       if (!arguments.length) return sourcePadding;
  //       sourcePadding = d3_functor(v);
  //       return chord;
  //     };
  //     chord.targetPadding = function(v) {
  //       if (!arguments.length) return targetPadding;
  //       targetPadding = d3_functor(v);
  //       return chord;
  //     };

  //     chord.source = function(v) {
  //       if (!arguments.length) return source;
  //       source = d3_functor(v);
  //       return chord;
  //     };

  //     chord.target = function(v) {
  //       if (!arguments.length) return target;
  //       target = d3_functor(v);
  //       return chord;
  //     };

  //     chord.startAngle = function(v) {
  //       if (!arguments.length) return startAngle;
  //       startAngle = d3_functor(v);
  //       return chord;
  //     };

  //     chord.endAngle = function(v) {
  //       if (!arguments.length) return endAngle;
  //       endAngle = d3_functor(v);
  //       return chord;
  //     };

    
    

  //   function d3_svg_chordRadius(d) {
  //     return d.radius;
  //   }
  //   function d3_svg_chordTargetPadding(d) {
  //     return d.targetPadding;
  //   }
  //   function d3_svg_chordSourcePadding(d) {
  //     return d.sourcePadding;
  //   }
  // }
  countrymerge = function(data, countries) {
    return data.regions.reduce(function(memo, region, i) {
      if (countries.indexOf(region) === -1) {
        memo.push(region);
      } else {
        for (var idx = region + 1; idx < (data.regions[i + 1] || data.names.length); idx++) {
          memo.push(idx);
        }
      }

      return memo;
    }, []);
  };

    layout = function() {
    var chord = {},
        chords,
        groups,
        data,
        matrix,
        indices,
        countries,
        year,
        n,
        padding = 0,
        threshold = null,
        sortGroups,
        sortSubgroups,
        sortChords,
        alpha;

    // get region from country index
    function region(index) {
      var r = 0;
      for (var i = 0; i < data.regions.length; i++) {
        if (data.regions[i] > index) {
          break;
        }
        r = i;
      }
      return data.regions[r];
    }

    function relayout() {
      var subgroups = {},
          groupSums = [],
          groupIndex = d3.range(n),
          subgroupIndex = [],
          k,
          x,
          x0,
          i,
          j;

      data = data //|| { matrix: {}, names: [], regions: []};
      year = /* year || */ Object.keys(data.matrix)[0];
      matrix = year && data.matrix[year] //|| [];
      console.log(year)
      chords = [];
      groups = [];

      // Compute the sum.
      k = 0, i = -1; while (++i < n) {
        x = 0, j = -1; while (++j < n) {
          x += matrix[indices[i]][indices[j]];
          x += matrix[indices[j]][indices[i]];
          // if (x === 0) {
          //   x = 1;
          // }
        }
        groupSums.push(x);
        subgroupIndex.push({source: d3.range(n), target: d3.range(n)});
        k += x;
      }

      // Sort groups…
      if (sortGroups) {
        groupIndex.sort(function(a, b) {
          return sortGroups(groupSums[a], groupSums[b]);
        });
      }

      // Sort subgroups…
      if (sortSubgroups) {
        subgroupIndex.forEach(function(d, i) {
          d.source.sort(function(a, b) {
            return sortSubgroups(matrix[indices[i]][indices[a]], matrix[indices[i]][indices[b]]);
          });
          d.target.sort(function(a, b) {
            return sortSubgroups(matrix[indices[a]][indices[i]], matrix[indices[b]][indices[i]]);
          });
        });
      }

      // TODO: substract padding from chords, instead of adding it to chrord sum
      // padding = 0;

      // Convert the sum to scaling factor for [0, 2pi].
      // TODO Allow start and end angle to be specified.
      // TODO Allow padding to be specified as percentage?
      k = (2 * π - padding * n) / k;

      // Compute the start and end angle for each group and subgroup.
      // Note: Opera has a bug reordering object literal properties!
      x = chord.alpha(), i = -1; while (++i < n) {
        var inflow = 0;
        var outflow = 0;

        var di = groupIndex[i];
        // targets
        x0 = x, j = -1; while (++j < n) {
          var dj = subgroupIndex[di].target[j],
              v = matrix[indices[dj]][indices[di]],
              a0 = x,
              d = v * k;
          x += d;
          subgroups['target' + '-' + di + "-" + dj] = {
            originalIndex: indices[dj],
            index: di,
            subindex: dj,
            startAngle: a0,
            dAngle: v * k,
            value: v
          };
          inflow += v;
        }
        var lastX0 = x0;
        // sources
        x0 = x, j = -1; while (++j < n) {
          var dj = subgroupIndex[di].source[j],
              v = matrix[indices[di]][indices[dj]],
              a0 = x,
              d = v * k;
          x += d;
          subgroups['source' + '-' + di + "-" + dj] = {
            originalIndex: indices[di],
            index: di,
            subindex: dj,
            startAngle: a0,
            dAngle: v * k,
            value: v
          };
          outflow += v;
        }
        
        groups[di] = {
          id: indices[di],
          region: region(indices[di]),
          index: di,
          startAngle: lastX0,
          endAngle: x,
          angle: lastX0 + (x - lastX0) / 2,
          inflow: inflow,
          outflow: outflow,
          value: Math.round((x - lastX0) / k)
        };
        x += padding;
      }

      // Generate chords for each (non-empty) subgroup-subgroup link.
      i = -1; while (++i < n) {
        j = i - 1; while (++j < n) {
          var source = subgroups['source' + '-' + i + "-" + j],
              target = subgroups['target' + '-' + j + "-" + i];
          if (i === j) {
            if (threshold === null || source.value > threshold) {
              var target = subgroups['target' + '-' + i + "-" + j];
              chords.push({
                id: 'source-' + indices[i] + "-" + indices[j],
                source: {
                  id: indices[source.index],
                  region: region(indices[source.index]),
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.value
                },
                target: {
                  id: indices[target.index],
                  region: region(indices[target.index]),
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.value
                }
              });
            }
          } else {
            if (threshold === null || source.value > threshold) {
              chords.push({
                id: 'source-' + indices[i] + "-" + indices[j],
                source: {
                  id: indices[source.index],
                  region: region(indices[source.index]),
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.value
                },
                target: {
                  id: indices[target.index],
                  region: region(indices[target.index]),
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.value
                }
              });
            }
            var source = subgroups['source' + '-' + j + "-" + i],
                target = subgroups['target' + '-' + i + "-" + j];
            if (threshold === null || source.value > threshold) {
              chords.push({
                id: 'target-' + indices[i] + "-" + indices[j],
                source: {
                  id: indices[source.index],
                  region: region(indices[source.index]),
                  index: source.index,
                  subindex: source.subindex,
                  startAngle: source.startAngle,
                  endAngle: source.startAngle + source.dAngle,
                  value: source.value
                },
                target: {
                  id: indices[target.index],
                  region: region(indices[target.index]),
                  index: target.index,
                  subindex: target.subindex,
                  startAngle: target.startAngle,
                  endAngle: target.startAngle + target.dAngle,
                  value: target.value
                }
              });
            }
          }
        }
      }

      if (sortChords) resort();
    }

    function resort() {
      chords.sort(function(a, b) {
        return sortChords(a.source.value, b.source.value);
      });
    }

    chord.data = function(x) {
      if (!arguments.length) return data;
      data = x;
      indices = data.regions.slice();
      n = indices.length;
      chords = groups = null;
      return chord;
    };

    chord.year = function(x) {
      if (!arguments.length) return year;
      year = x;
      chords = groups = null;
      return chord;
    };

    chord.countries = function(x) {
      if (!arguments.length) return countries;
      countries = x;
      indices = countrymerge(data, countries);
      n = indices.length;
      chords = groups = null;
      return chord;
    };

    chord.padding = function(x) {
      if (!arguments.length) return padding;
      padding = x;
      chords = groups = null;
      return chord;
    };

    chord.threshold = function(x) {
      if (!arguments.length) return threshold;
      threshold = x;
      chords = groups = null;
      return chord;
    };

    chord.sortGroups = function(x) {
      if (!arguments.length) return sortGroups;
      sortGroups = x;
      chords = groups = null;
      return chord;
    };

    chord.sortSubgroups = function(x) {
      if (!arguments.length) return sortSubgroups;
      sortSubgroups = x;
      chords = null;
      return chord;
    };

    chord.sortChords = function(x) {
      if (!arguments.length) return sortChords;
      sortChords = x;
      if (chords) resort();
      return chord;
    };

    chord.chords = function() {
      if (!chords) relayout();
      return chords;
    };

    chord.groups = function() {
      if (!groups) relayout();
      return groups;
    };

    // start angle for first region (decimal degrees)
    // (stored internally in radians)
    chord.alpha = function(x) {
      if (!arguments.length) return alpha * degrees;
      alpha = (x === 0) ? 0.00001 : x; // small but not zero
      alpha *= radians;
      alpha = alpha.mod(2*π);
      chords = groups = null;
      return chord;
    };

    // proper modulus (works taking the sign of the divisor not of the dividend)
    Number.prototype.mod = function (n) {
            return ((this % n) + n) % n;
    };

    return chord;
  };
    ////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////
    var π = Math.PI;
    // data = data.ref
    console.log(data)
    let config =/*  config || */ {};
    config.element = '#diagram';

    config.now = config.now || Object.keys(data.matrix)[0];
    // config.now = config.now || Object.keys(data.matrix)[0];

    // geometry
    config.width = config.width || 1100;
    config.height = config.height || 1100;
    config.margin = config.margin || 125; 
    config.outerRadius = config.outerRadius || (Math.min(config.width, config.height) / 2 - config.margin);
    config.arcWidth = config.arcWidth || 24;
    config.innerRadius = config.innerRadius || (config.outerRadius - config.arcWidth);
    config.arcPadding = config.arcPadding || 0.005;
    config.sourcePadding = config.sourcePadding || 3;
    config.targetPadding = config.targetPadding || 20;
    config.labelPadding = config.labelPadding || 10;
    config.labelRadius = config.labelRadius || (config.outerRadius + config.labelPadding);

    // animation
    var aLittleBit = π / 100000;
    config.animationDuration = config.animationDuration || 1000;
    config.initialAngle = config.initialAngle || {};
    config.initialAngle.arc = config.initialAngle.arc || { startAngle: 0, endAngle: aLittleBit };
    config.initialAngle.chord = config.initialAngle.chord || { source: config.initialAngle.arc, target: config.initialAngle.arc };

    // layout
    config.layout = config.layout || {};
    config.layout.sortSubgroups = config.layout.sortSubgroups || d3.descending;
    config.layout.sortChords = config.layout.sortChords || d3.descending;
    config.layout.threshold = config.layout.threshold || 1000;
    config.layout.labelThreshold = config.layout.labelThreshold || 100000;
    config.layout.alpha = config.layout.alpha || aLittleBit; // start angle for first region (0, zero, is up North)

    config.maxRegionsOpen = config.maxRegionsOpen || 2;
    config.infoPopupDelay = config.infoPopupDelay || 300;


    var colors = d3.scaleOrdinal(d3.schemeCategory10).domain(data.regions);
    // var colors = d3.scale.category10().domain(data.regions);
    if (config.layout.colors) {
      colors.range(config.layout.colors);
    }

    function arcColor(d) {
      if (d.region === d.id) {
        return colors(d.region);
      }
      var hsl = d3.hsl(colors(d.region));
      var r = [hsl.brighter(0.75), hsl.darker(2), hsl, hsl.brighter(1.5), hsl.darker(1)];
      return r[(d.id - d.region) % 5];
    }

    function chordColor(d) {
      return arcColor(d.source);
    }

    // state before animation
    var previous = {
      countries: []
    };

    Number.prototype.mod = function (n) {
            return ((this % n) + n) % n;
    };

    // calculate label position
    function labelPosition(angle) {
      var temp = angle.mod(2*π);
      return {
        x: Math.cos(temp - π / 2) * config.labelRadius,
        y: Math.sin(temp - π / 2) * config.labelRadius,
        r: (temp - π / 2) * 180 / π
      };
    }

    function formatNumber(nStr, seperator) {
      seperator = seperator || ',';

      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = x.length > 1 ? '.' + x[1] : '';
      var rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + seperator + '$2');
      }
      return x1 + x2;
    }

    function luminicity(color) {
      var rgb = d3.rgb(color);

      return 0.21 * rgb.r + 0.71 * rgb.g + 0.07 * rgb.b;
    }

    // arc path generator
    var textPathArc = d3.arc()
        .innerRadius(config.outerRadius + 10)
        .outerRadius(config.outerRadius + 10);
    var textPathArc2 = d3.arc()
        .innerRadius(config.outerRadius + 18)
        .outerRadius(config.outerRadius + 18);

    // arc generator
    var arc = d3.arc()
        .innerRadius(config.innerRadius)
        .outerRadius(config.outerRadius);

    // chord diagram
    var layout = layout()
        .padding(config.arcPadding)
        .threshold(config.layout.threshold)
        .data(data)
        .year(config.now);
    // console.log(layout)
    if (config.layout.sortGroups) {
      layout.sortGroups(config.layout.sortGroups);
    }
    if (config.layout.sortSubgroups) {
      layout.sortSubgroups(config.layout.sortSubgroups);
    }
    if (config.layout.sortChords) {
      layout.sortChords(config.layout.sortChords);
    }
    if (config.layout.alpha) {
      layout.alpha(config.layout.alpha);
    }
    // Globalmigration = {}
    // chord path generator
    var chordGenerator = d3.chordDirected()
      .padAngle(1 / innerRadius)
      .sortSubgroups(d3.descending)
      .sortChords(d3.descending);
      // .sourcePadding(config.sourcePadding)
      // .targetPadding(config.targetPadding);
        // .radius(config.innerRadius)

    // svg element
    var svg = d3.select("#diagram").append("svg")
        .attr('preserveAspectRatio', 'xMidYMid')
        .attr('viewBox', '0 0 ' + config.width + ' ' + config.height)
        .attr("width", config.width)
        .attr("height", config.height);
    
    var element = svg.append("g")
        .attr("id", "circle") 
        .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")");

    d3.select(window).on('resize.svg-resize', function() {

      var width = 500 //svg.node().parentNode.clientWidth;

      if (width) {
        // make height adapt to shrinking of page
        if (width < config.width) {
          svg.attr('height', width);
        }
      }
    });

    // needed for fade mouseover
    var circle = element.append("circle").attr("r", config.outerRadius + 24);

    var filter = svg.append('filter').attr('id', 'dropshadow');
    filter.append('feGaussianBlur').attr({
      in: 'SourceAlpha',
      stdDeviation: 2
    });
    filter.append('feOffset').attr({
      dx: 0,
      dy: 1,
      result: 'offsetblur'
    });
    filter.append('feComponentTransfer').append('feFuncA').attr({
      type: 'linear',
      slope: 0.5
    });
    var femerge = filter.append('feMerge');
    femerge.append('feMergeNode');
    femerge.append('feMergeNode').attr('in', 'SourceGraphic');

    var info = svg.append('g')
      .attr('class', 'info-group')
      .attr("transform", "translate(" + config.width / 2 + "," + config.height / 2 + ")")
      .append('g')
        .attr('class', 'info')
        .attr('opacity', 0);
    
    info.append('rect')
      .style('filter', 'url(#dropshadow)');
    info.append('g').attr('class', 'text');

    svg.on('mousemove', function() {
      info
        .transition()
        .duration(10)
        .attr('opacity', 0);
    });

    circle.on('mouseout', function() {
      if (infoTimer) {
        clearTimeout(infoTimer);
      }
      info
        .transition()
        .duration(10)
        .attr('opacity', 0);
    });

    var infoTimer;

    // eg: West Africa: Total inflow 46, Total outflow 2
    function groupInfo(d) {
      var el = this;

      if (infoTimer) {
        clearTimeout(infoTimer);
      }

      var bbox = el.getBBox();
      infoTimer = setTimeout(function() {
        var color = d3.select(el).style('fill');

        info
          .attr('transform', 'translate(' + (bbox.x + bbox.width / 2) + ',' + (bbox.y + bbox.height / 2) + ')');

        var text = info.select('.text').selectAll('text')
          .data([
            data.names[d.id],
            'Total In: ' + formatNumber(d.inflow),
            'Total Out: ' + formatNumber(d.outflow)
          ]);
        text.enter().append('text');
        text
          .text(function(t) { return t; })
          .style({
            fill: luminicity(color) > 160 ? 'black' : 'white'
          })
          .attr({
            transform: function(t, i) {
              return 'translate(6, ' + (i * 14 + 16) + ')';
            }
          });
        text.exit().remove();

        var tbbox = info.select('.text').node().getBBox();
        info.select('rect')
          .style('fill', color)
          .attr({
            width: tbbox.width + 12,
            height: tbbox.height + 10
          });

        info
          .transition()
          .attr('opacity', 1);
      }, config.infoPopupDelay);
    }

    // chord info
    // eg: West Asia → Pacific: 46
    function chordInfo(d) {
      var el = this;

      if (infoTimer) {
        clearTimeout(infoTimer);
      }

      var bbox = el.getBBox();
      infoTimer = setTimeout(function() {
        var color = d3.select(el).style('fill');

        info.attr('transform', 'translate(' + (bbox.x + bbox.width / 2) + ',' + (bbox.y + bbox.height / 2) + ')')
          .attr('opacity', 0)
          .transition()
          .attr('opacity', 1);

        var text = info.select('.text').selectAll('text')
          .data([
            data.names[d.source.id] + ' → ' + data.names[d.target.id] + ': ' + formatNumber(d.source.value)
          ]);
        text.enter().append('text');
        text.exit().remove();
        text
          .text(function(t) { return t; })
          .style({
            fill: luminicity(color) > 160 ? 'black' : 'white'
          })
          .attr('transform', function(t, i) {
            return 'translate(6, ' + (i * 12 + 16) + ')';
          });

        info.selectAll('rect').style('fill', d3.select(el).style('fill'));

        var tbbox = info.select('.text').node().getBBox();
        info.select('rect')
          .attr({
            width: tbbox.width + 12,
            height: tbbox.height + 10
          });
      }, config.infoPopupDelay);
    }


    function rememberTheGroups() {
      previous.groups = layout.groups().reduce(function(sum, d) {
        sum[d.id] = d;
        return sum;
      }, {});
    }
    function rememberTheChords() {
      previous.chords = layout.chords().reduce(function(sum, d) {
        sum[d.source.id] = sum[d.source.id] || {};
        sum[d.source.id][d.target.id] = d;
        return sum;
      }, {});
    }

    function getCountryRange(id) {
      var end = data.regions[data.regions.indexOf(id) + 1];

      return {
        start: id + 1,
        end: end ? end - 1 : data.names.length - 1
      };
    }

    function inRange(id, range) {
      return id >= range.start && id <= range.end;
    }

    function inAnyRange(d, ranges) {
      return !!ranges.filter(function(range) { return inRange(d.source.id, range) || inRange(d.target.id, range); }).length;
    }

    // Transition countries to region:
    // Use first country's start angle and last countries end angle. 
    function meltPreviousGroupArc(d) {
      if (d.id !== d.region) {
        return;
      }

      var range = getCountryRange(d.id);
      var start = previous.groups[range.start];
      var end = previous.groups[range.end];

      if (!start || !end) {
        return;
      }

      return {
        angle: start.startAngle + (end.endAngle - start.startAngle) / 2,
        startAngle: start.startAngle,
        endAngle: end.endAngle
      };
    }

    // Used to set the startpoint for
    // countries -> region
    // transition, that is closing a region.
    function meltPreviousChord(d) {
      if (d.source.id !== d.source.region) {
        return;
      }
      
      var c = {
        source: {},
        target: {}
      };

      Object.keys(previous.chords).forEach(function(sourceId) {
        Object.keys(previous.chords[sourceId]).forEach(function(targetId) {
          var chord = previous.chords[sourceId][targetId];

          if (chord.source.region === d.source.id) {
            if (!c.source.startAngle || chord.source.startAngle < c.source.startAngle) {
              c.source.startAngle = chord.source.startAngle;
            }
            if (!c.source.endAngle || chord.source.endAngle > c.source.endAngle) {
              c.source.endAngle = chord.source.endAngle;
            }
          }
          
          if (chord.target.region === d.target.id) {
            if (!c.target.startAngle || chord.target.startAngle < c.target.startAngle) {
              c.target.startAngle = chord.target.startAngle;
            }
            if (!c.target.endAngle || chord.target.endAngle > c.target.endAngle) {
              c.target.endAngle = chord.target.endAngle;
            }
          }
        });
      });
      
      c.source.startAngle = c.source.startAngle || 0;
      c.source.endAngle = c.source.endAngle || aLittleBit;
      c.target.startAngle = c.target.startAngle || 0;
      c.target.endAngle = c.target.endAngle || aLittleBit;

      // transition from start
      c.source.endAngle = c.source.startAngle + aLittleBit;
      c.target.endAngle = c.target.startAngle + aLittleBit;

      return c;
    }


    // finally draw the diagram
    function draw(year, countries) {
      year = year || Object.keys(data.matrix)[0];
      countries = countries || previous.countries;
      previous.countries = countries;
      var ranges = countries.map(getCountryRange);

      rememberTheGroups();
      rememberTheChords();

      layout
        .year(year)
        .countries(countries);

      // groups
      var group = element.selectAll(".group")
        .data(layout.groups, function(d) { return d.id; });
      group.enter()
        .append("g")
        .attr("class", "group");
      group
        .on("mouseover", function(d) {
          chord.classed("fade", function(p) {
            return p.source.id !== d.id && p.target.id !== d.id;
          });
        });
      group.exit().remove();
      
      // group arc
      var groupPath = group.selectAll('.group-arc')
        .data(function(d) { return [d]; });
      groupPath.enter()
        .append('path')
        .attr("class", "group-arc")
        .attr("id", function(d, i, k) { return "group" + k; });
      groupPath
        .style("fill", arcColor)
        .on("mousemove", groupInfo)
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
          var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
          return function (t) { return arc(i(t)); };
        });
      groupPath.exit().remove();

      // open regions
      groupPath
        .filter(function(d) {
          return d.id === d.region;
        })
        .on('click', function(d) {
          if (countries.length + 1 > config.maxRegionsOpen) {
            countries.shift();
          }
          draw(year, countries.concat(d.id));
        });

      // close regions
      groupPath
        .filter(function(d) {
          return d.id !== d.region;
        })
        .on('click', function(d) {
          countries.splice(countries.indexOf(d.region), 1);
          draw(year, countries);
        });

      
      // text label group
      var groupTextGroup = element.selectAll('.label')
        .data(layout.groups, function(d) { return d.id; });
      groupTextGroup.enter()
        .append("g")
        .attr('class', 'label');
      groupTextGroup
        .filter(function(d) {return d.id !== d.region})
        .transition()
        .duration(config.animationDuration)
        .attrTween("transform", function(d) {
          var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || { angle: 0 }, d);
          return function (t) {
            var t = labelPosition(i(t).angle);
            return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
          };
        });
      groupTextGroup.exit()
        .transition()
        .duration(config.animationDuration)
        .style('opacity', 0)
        .attrTween("transform", function(d) {
          // do not animate region labels
          if (d.id === d.region) {
            return;
          }

          var region = layout.groups().filter(function(g) { return g.id === d.region });
          region = region && region[0];
          var angle = region && (region.startAngle + (region.endAngle - region.startAngle) / 2);
          angle = angle || 0;
          var i = d3.interpolate(d, { angle: angle });
          return function (t) {
            var t = labelPosition(i(t).angle);
            return 'translate(' + t.x + ' ' + t.y + ') rotate(' + t.r + ')';
          };
        })
        .each('end', function() {
          d3.select(this).remove();
        });

      // labels
      var groupText = groupTextGroup.selectAll('text')
        .data(function(d) { return [d]; });
      groupText.enter()
        .append("text")
      groupText
        .classed('region', function(d) {
          return d.id === d.region;
        })
        .text(function(d) { 
          if (d.id !== d.region) {
            return data.names[d.id];
          } 
        })
        .attr('transform', function(d) {
          if (d.id !== d.region) {
            return d.angle.mod(2*π) > π ? 'translate(0, -4) rotate(180)' : 'translate(0, 4)';
          }
        })
        .attr('text-anchor', function(d) {
          return d.id === d.region ?
            'middle' :
            (d.angle.mod(2*π) > π ? 'end' : 'start');
        })
        .style('fill', function(d) {
          return d.id === d.region ? arcColor(d) : null;
        })
        .classed('fade', function(d) {
          // hide labels for countries with little migrations
          return d.value < config.layout.labelThreshold;
        });

      // path for text-on-path
      var groupTextPathPath = group
        .filter(function(d) {return d.id === d.region})
        .selectAll('.group-textpath-arc')
        .data(function(d) { return [d]; });
      groupTextPathPath.enter()
        .append('path')
        .attr("class", "group-textpath-arc")
        .attr("id", function(d, i, k) { return "group-textpath-arc" + d.id; });
      groupTextPathPath
        .style("fill", 'none')
        .transition()
        .duration(config.animationDuration)
        .attrTween("d", function(d) {
          var i = d3.interpolate(previous.groups[d.id] || previous.groups[d.region] || meltPreviousGroupArc(d) || config.initialAngle.arc, d);
          if (d.angle.mod(2*π) > π/2 && d.angle.mod(2*π) < π*3/2) {
            return function (t) {
              return textPathArc2(i(t)); 
            };
          } else {
            return function (t) {
              return textPathArc(i(t)); 
            };
          }
        });
      groupTextPathPath.exit().remove();

      // text on path
      var groupTextPath = groupText
        .filter(function(d) {return d.id === d.region})
        .selectAll('textPath')
        .data(function(d) { return [d]; });
      groupTextPath
        .enter()
        .append("textPath")
      groupTextPath
        .text(function(d) { return data.names[d.id]; })
        .attr('startOffset', function(d) {
          if (d.angle.mod(2*π) > π/2 && d.angle.mod(2*π) < π*3/2) {
            return '75%';
          } else {
            return '25%';
          }
        })
        .attr("xlink:href", function(d, i, k) { return "#group-textpath-arc" + d.id; });


      groupTextPath
        .filter(function(d, i) {
          return this.getComputedTextLength() > (d.endAngle - d.startAngle) * (config.outerRadius + 18);
        })
        .remove();



      // chords
      var chord = element.selectAll(".chord")
          .data(layout.chords, function(d) { return d.id; });
      chord.enter()
        .append("path")
        .attr("class", "chord")
        .on('mousemove', chordInfo);
      chord
        .style("fill", chordColor)
        .transition()
        .duration(config.animationDuration)
        /* .attrTween("d", function(d) {
          var p = previous.chords[d.source.id] && previous.chords[d.source.id][d.target.id];
          p = p || (previous.chords[d.source.region] && previous.chords[d.source.region][d.target.region]);
          p = p || meltPreviousChord(d);
          p = p || config.initialAngle.chord;
          var i = d3.interpolate(p, d);
          return function (t) {
            console.log("chordGenerator(i(t))")
            return chordGenerator(i(t));
          };
        }); */
      chord.exit()
        .transition()
        .duration(config.animationDuration)
        .style('opacity', 0)
        .attrTween("d", function(d) {
          var i = d3.interpolate(d, {
            source: {
              startAngle: d.source.endAngle - aLittleBit,
              endAngle: d.source.endAngle
            },
            target: {
              startAngle: d.target.endAngle - aLittleBit,
              endAngle: d.target.endAngle
            }
          });
          return function (t) {
            return chordGenerator(i(t));
          };
        })
        .each('end', function() {
          d3.select(this).remove();
        });


      chord.classed("unselected", ranges.length ? function(d) {
        return !inAnyRange(d, ranges);
      } : false);

      d3.select(window).on('resize.svg-resize')();
    }
    
    



    draw(1)
    
});


    // })
    
    /* .tween('circumference', function(d) {
        let currentAngle = getCurrentAngle(this);
        let targetAngle = d;

        // Ensure shortest path is taken
        if (targetAngle - currentAngle > Math.PI) {
            targetAngle -= 2 * Math.PI;
        }
        else if (targetAngle - currentAngle < -Math.PI) {
            targetAngle += 2 * Math.PI;
        }

        let i = d3.interpolate(currentAngle, targetAngle);

        return function(t) {
            let angle = i(t);

            d3.select(this)
                .attr('cx', majorRadius * Math.cos(angle))
                .attr('cy', majorRadius * Math.sin(angle));
        }
    }); */
// function getCurrentAngle(el) {
// 	let x = d3.select(el).attr('cx');
// 	let y = d3.select(el).attr('cy');
// 	return Math.atan2(y, x);
// }

// UX & animation
// - Tween arcs && ribbons
// - Click -> Countries + regions matrix
// - Arc (text names) -> from 0.5 to 1.5 rads text for names: reverse vertically
// - Global styles and selectors

// Data 
// - Data_input -> json structure (ask Guy)
// - Filters: 
//      (X) Year
//      Type
//      Gender




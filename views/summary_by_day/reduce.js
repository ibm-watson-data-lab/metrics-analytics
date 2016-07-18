function(key, values, rereduce) {
  var counts = {};
  for (var i=0; i<values.length; i++) {
    for (var type in values[i]) {
      if (typeof counts[type] == 'number') {
        counts[type] += values[i][type];
      }
      else {
        counts[type] = values[i][type];
      }
    }
  }
  return counts;
}
function(key, values, rereduce) {
  var total = 0;
  var topResultCount = 0;
  for (var i = 0 ; i< values.length; i++) {
    if (!rereduce ) {
      total ++;
      topResultCount = values[i][1];
    }
    else {
      total += values[i].count;
      topResultCount = Math.max( topResultCount, values[i].topResultCount);
    }		
  }
  return {"count": total, "topResultCount": topResultCount };
}
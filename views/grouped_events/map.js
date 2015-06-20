function(doc) {
	if (doc.type && doc.idsite && doc.date ) {
		var ar = doc.date.split("-");
		if ( ar.length == 3 ){
			emit([ doc.idsite, Number(ar[0]), Number(ar[1]), Number(ar[2]), doc.type], 1);
		}
	}
};
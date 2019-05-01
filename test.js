var Person = function(name,age){
	var self = {
		name:0,
		age:50,
	}

	self.sayName = function(){
		console.log("Hi, my name is "+name);
	}
}

var Worker = function(profession){
	var self = Person();
	self.profession	= profession;
}

var Jane = Person("Jane", 43);
Jane.sayName();
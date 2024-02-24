function isNull(value){
	return value === undefined || value === null;
}

function cloneObject(object){
	var newObject = {};

	for(var [name,value] of Object.entries(object)){
		newObject[name] = value;
	}

	return newObject;
}

function end(array){
	return array[array.length - 1];
}

var objectMirror = {
	query:(mainObject,query) => {
		var [entrieName,entrieValue] = query.split(":");
		var returnedNode = null;

		function loop(nodes){
			for(var node of nodes){
				if(!isNull(node.attributes[entrieName])){
					if(entrieValue === node.attributes[entrieName]){
						returnedNode = node;
						return;
					}
				}

				if(Array.isArray(node.nodes)){
					loop(node.nodes);
				}
			}
		}

		loop(mainObject.nodes);
		return returnedNode;
	},
	queryAll:(mainObject,query) => {
		var [entrieName,entrieValue] = query.split(":");
		var returnedNodes = [];

		function loop(nodes){
			for(var node of nodes){
				if(!isNull(node.attributes[entrieName])){
					if(entrieValue === node.attributes[entrieName]){
						returnedNodes.push(node);
					}
				}

				if(Array.isArray(node.nodes)){
					loop(node.nodes);
				}
			}
		}

		loop(mainObject.nodes);
		return returnedNodes;
	},
	index:(mainObject) => {
		return mainObject.container.nodes.indexOf(mainObject);
	},
	clear:(mainObject) => {
		function deleteAll(array){
			for(var node of array){
				if(!isNull(node.finalize)){
					node.finalize();
				}

				node.delete();

				if(node.nodes.length > 0){
					deleteAll(node.nodes);
				}
			}
		}

		deleteAll(mainObject.nodes);
	},
	delete:(mainObject) => {
		function deleteAll(array){
			for(var node of array){
				if(!isNull(node.finalize)){
					node.finalize();
				}

				node.delete();

				if(node.nodes.length > 0){
					deleteAll(node.nodes);
				}
			}
		}

		if(!isNull(mainObject.finalize)){
			mainObject.finalize();
		}

		deleteAll(mainObject.nodes);

		mainObject.node.remove();
		mainObject.container.nodes.splice(mainObject.index(),1);
	},
	clone:(mainObject,container,index) => {
		function cloneNodes(array){
			var returnedNodes = [];

			for(var node of array){
				var childNode = {
					type:node.type,
					name:node.name,
					entries:Object.assign(
						cloneObject(node.attributes),
						{nodes:cloneNodes(node.nodes),text:node.text}
					)
				}

				returnedNodes.push(childNode.name);
				returnedNodes.push(childNode.entries);
			}

			return returnedNodes;
		}

		var entries = Object.assign(
			cloneObject(mainObject.attributes),
			{nodes:cloneNodes(mainObject.nodes),text:mainObject.text}
		)

		container.new(mainObject.name,entries,isNull(index) ? null : index);
	},
	hasAttribute:(mainObject,name) => {
		return !isNull(mainObject.attributes[name]);
	},
	getAttribute:(mainObject,name) => {
		return mainObject.hasAttribute(name) ? mainObject.attributes[name] : null;
	},
	setAttribute:(mainObject,name,value) => {
		mainObject.attributes[name] = value;
	},
	setText:(mainObject,newText) => {
		mainObject.text = newText;
		mainObject.node.innerText = newText;
	},
	getText:(mainObject) => {
		return mainObject.text;
	},
	getScroll:(mainObject) => {
		return{
			scrollInsertX:mainObject.node.scrollLeft,
			scrollInsertY:mainObject.node.scrollTop
		}
	},
	setScroll:(mainObject,x,y) => {
		mainObject.node.scrollLeft = x;
		mainObject.node.scrollTop = y;
	},
	getOffset:(mainObject) => {
		var viewport = mainObject.node.getBoundingClientRect();

		return{
			insertX:          mainObject.node.offsetWidth ,
			insertY:          mainObject.node.offsetHeight,
			scrollScaleX:     mainObject.node.scrollWidth ,
			scrollScaleY:     mainObject.node.scrollHeight,
			containerInsertX: mainObject.node.offsetLeft  ,
			containerInsertY: mainObject.node.offsetTop   ,
			viewportInsertX:  viewport.left               ,
			viewportInsertY:  viewport.top
		}
	}
}

class xkui{
	constructor(container){
		this.container = isNull(container) ? document.body : container;

		this.view = {};
		this.views = {};
		this.components = {};
	}

	setContainer(element){
		this.container = element;
	}
	getContainer(element){
		return this.container;
	}

	render(name,entries,mirrorView,index){
		var self = this;

		if(Object.keys(self.components).includes(name)){
			var newElement = document.createElement("div");
			var component = cloneObject(self.components[name]);

			mirrorView.nodes.push(Object.assign(component,{
				container:mirrorView,
				path:[...mirrorView.path,mirrorView],
				nodes:[],
				node:newElement,
				type:"component",
				name:name,
				new:function(nodeName,nodeEntries,nodeIndex){self.render(nodeName,nodeEntries,this,nodeIndex)},
				query:function(query){return objectMirror.query(this,query)},
				queryAll:function(query){return objectMirror.queryAll(this,query)},
				index:function(){return objectMirror.index(this)},
				delete:function(){objectMirror.delete(this)},
				clone:function(parentContainer,parentIndex){objectMirror.clone(this,parentContainer,parentIndex)},
				move:function(parentContainer,parentIndex){objectMirror.clone(this,parentContainer,parentIndex);this.delete()},
				hasAttribute:function(attributeName){return objectMirror.hasAttribute(this,attributeName)},
				getAttribute:function(attributeName){return objectMirror.getAttribute(this,attributeName)},
				setAttribute:function(attributeName,attributeValue){objectMirror.setAttribute(this,attributeName,attributeValue)},
				setText:function(newText){objectMirror.setText(this,newText)},
				getText:function(){objectMirror.getText(this)},
				clear:function(){objectMirror.clear(this)},
				setScroll:function(x,y){objectMirror.setScroll(this,x,y)},
				getScroll:function(){objectMirror.getScroll(this)},
				getOffset:function(){objectMirror.getOffset(this)}
			}));

			if(isNull(entries) || entries.length === 0){
				return;
			}

			for(var [attributeName,attributeValue] of Object.entries(entries)){
				component.attributes[attributeName] = attributeValue;
			}

			component.render(component);

			var realContainer = mirrorView.type === "view" ? self.container : mirrorView.node;
			
			if(isNull(index)){
				realContainer.appendChild(newElement);
			}else{				
				if(index < 0 || index >= realContainer.children.length){
					realContainer.appendChild(newElement);
				}else{
					realContainer.insertBefore(newElement,realContainer.children[index]);
				}
			}
		}else{
			var newElement = document.createElement(name);

			mirrorView.nodes.push({
				text:"",
				type:"element",
				name:name,
				node:newElement,
				attributes:{},
				nodes:[],
				container:mirrorView,
				path:[...mirrorView.path,mirrorView],
				new:function(nodeName,nodeEntries,nodeIndex){self.render(nodeName,nodeEntries,this.node,this,nodeIndex)},
				query:function(query){return objectMirror.query(this,query)},
				queryAll:function(query){return objectMirror.queryAll(this,query)},
				index:function(){return objectMirror.index(this)},
				delete:function(){objectMirror.delete(this)},
				clone:function(parentContainer,parentIndex){objectMirror.clone(this,parentContainer,parentIndex)},
				move:function(parentContainer,parentIndex){objectMirror.clone(this,parentContainer,parentIndex);this.delete()},
				hasAttribute:function(attributeName){return objectMirror.hasAttribute(this,attributeName)},
				getAttribute:function(attributeName){return objectMirror.getAttribute(this,attributeName)},
				setAttribute:function(attributeName,attributeValue){objectMirror.setAttribute(this,attributeName,attributeValue)},
				setText:function(newText){objectMirror.setText(this,newText)},
				getText:function(){objectMirror.getText(this)},
				clear:function(){objectMirror.clear(this)},
				setScroll:function(x,y){objectMirror.setScroll(this,x,y)},
				getScroll:function(){objectMirror.getScroll(this)},
				getOffset:function(){objectMirror.getOffset(this)}
			});

			if(!isNull(entries) || entries.length > 0){
				for(var [attributeName,attributeValue] of Object.entries(entries)){
					if(attributeName.toLowerCase() === "nodes" && attributeValue.length >= 2){
						for(var index = 0;index < attributeValue.length;){
							self.render(attributeValue[index],attributeValue[index + 1],end(mirrorView.nodes));
							index += 2;
						}
						continue;
					}

					if(attributeName.toLowerCase() === "xkclick"){
						newElement.addEventListener("click",attributeValue);
						continue;
					}

					if(attributeName.toLowerCase() === "text"){
						if(attributeValue.length > 0){
							end(mirrorView.nodes).text = attributeValue;
							newElement.textContent = attributeValue;
						}
						continue;
					}

					end(mirrorView.nodes).attributes[attributeName] = attributeValue;
					newElement.setAttribute(attributeName,attributeValue);
				}
			}

			var realContainer = mirrorView.type === "view" ? self.container : mirrorView.node;

			if(isNull(index)){
				realContainer.appendChild(newElement);
			}else{				
				if(index < 0 || index >= realContainer.children.length){
					realContainer.appendChild(newElement);
				}else{
					realContainer.insertBefore(newElement,realContainer.children[index]);
				}
			}
		}
	}

	newComponent(name,object){
		this.components[name] = object;
	}

	newView(name,object){
		this.views[name] = object;
	}

	renderView(name,attributes){
		var self = this;
		
		this.view = Object.assign({
			container:"root",
			path:["root"],
			type:"view",
			name:name,
			attributes:{},
			nodes:[],
			node:self.getContainer(),
			new:(nodeName,nodeEntries,nodeIndex) => {self.render(nodeName,nodeEntries,self.view,nodeIndex)},
			query:function(query){return objectMirror.query(this,query)},
			queryAll:function(query){return objectMirror.queryAll(this,query)},
			clear:function(){objectMirror.clear(this)},
			hasAttribute:function(attributeName){return objectMirror.hasAttribute(this,attributeName)},
			getAttribute:function(attributeName){return objectMirror.getAttribute(this,attributeName)},
			setAttribute:function(attributeName,attributeValue){objectMirror.setAttribute(this,attributeName,attributeValue)},
			setScroll:function(x,y){objectMirror.setScroll(this,x,y)},
			getScroll:function(){objectMirror.getScroll(this)},
			getOffset:function(){objectMirror.getOffset(this)}
		},this.views[name]);

		if(!isNull(attributes)){
			for(var [attributeName,attributeValue] of Object.entries(attributes)){
				this.view.attributes[attributeName] = attributeValue;
			}
		}

		for(var [attributeName,attributeValue] of Object.entries(this.views[name].attributes)){
			this.view.attributes[attributeName] = attributeValue;
		}

		this.view.render(this.view);
	}
}
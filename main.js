var ui = new xkui();

ui.newComponent("post",{
	attributes:{},

	finalize:() => {
		console.log("Este é seu fim");
	},

	render:(self) => {
		self.new("div",{style:"width:250px;height:250px;background:#101018;border-radius:3px"})
	}
})

ui.newView("home",{
	attributes:{},

	render:(self) => {
		self.new("post",{name:"cmp"})
	}
})

ui.renderView("home");
"use strict";

/*
 * Created with @iobroker/create-adapter v2.0.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const axios = require("axios").default;
const axiosTimeout = 8000;

const BASE_URL = "https://api.fitbit.com/1/user/";
const BASE2_URL = "https://api.fitbit.com/1.2/user/";

// Load your modules here, e.g.:

class Fitbit extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "fitbit",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));

		this.updateInterval = null;
		this.fitbit = {};
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		// Initialize your adapter here

		// Get system configuration
		// const sysConf = await this.getForeignObjectAsync("system.config");

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.info("config devices: " + this.config.devicerecords);
		this.setState("info.connection", false, true);

		this.login().
			then(() => {
				if (this.fitbit.status === 200) {

					this.setState("info.connection", true, true);
					this.getFitbitRecords();					// get data one time

					this.updateInterval = setInterval(() => {
						this.getFitbitRecords();
					}, this.config.refresh * 1000); 			// in seconds
				} else {
					this.setState("info.connection", false, true);
					this.log.warn(`FITBit login failed ${this.fitbit.status}`);
				}
			})
			.catch((error) => {
				this.log.error(`Adapter Connection Error: ${error} `);
			});
	}


	async login() {
		const url = "https://api.fitbit.com/1/user/-/profile.json";
		const token = this.config.token;
		try {
			const response = await axios.get(url,
				{
					headers: { "Authorization": `Bearer ${token}` },
					timeout: axiosTimeout
				});
			this.log.info(`Status: ${response.status}`);

			this.fitbit.status = response.status;

			if (this.fitbit.status === 200) {
				this.setState("info.connection", true, true);
				this.setUserStates(response.data);
			}
		}
		catch (err) {
			//this.log.error(`FITBIT Connection Error: ${err}`);
			throw new Error(err);
		}
	}

	setUserStates(data) {
		this.fitbit.user = data.user;				// Use instance object for data
		this.log.info(`User logged in ${this.fitbit.user.fullName}`);
		this.setState("user.fullName", this.fitbit.user.fullName, true);
	}

	async getFitbitRecords() {
		this.log.info(`Getting data for user ${this.fitbit.user.fullName}`);

		await this.getBodyRecords();
		await this.getFoodRecords();
		await this.getSleepRecords();
	}

	async getBodyRecords() {
		//const url = "https://api.fitbit.com/1/user/-/body/log/fat/date/2022-02-01.json";
		const url = `${BASE_URL}-/body/log/weight/date/${this.getDate()}.json`;

		//const token = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMjdHNUwiLCJzdWIiOiI4OTVXWEQiLCJpc3MiOiJGaXRiaXQiLCJ0eXAiOiJhY2Nlc3NfdG9rZW4iLCJzY29wZXMiOiJ3aHIgd251dCB3cHJvIHdzbGUgd3dlaSB3c29jIHdzZXQgd2FjdCB3bG9jIiwiZXhwIjoxNjQzODk0MTIwLCJpYXQiOjE2NDM4MDc3MjB9.wh7-CEc9Ysdj5CM5Tecs6AwqhWuzaaZ-s2ZMlTPpwIk";
		const token = this.config.token;
		try {
			const response = await axios.get(url,
				{
					headers: { "Authorization": `Bearer ${token}` },
					timeout: axiosTimeout
				});
			this.log.info(`Status: ${response.status}`);

			if (response.status === 200) {
				this.setBodyStates(response.data);
			}
		}
		catch (err) {
			this.log.error(`FITBIT Body Data Error: ${err}`);
		}
	}

	setBodyStates(data) {
		this.fitbit.body = data.weight[0];				// First record in the array
		this.log.info(`Body records retrieved Weight:${this.fitbit.body.weight} Fat:${this.fitbit.body.fat} BMI:${this.fitbit.body.bmi}`);
		this.setState("body.weight", this.fitbit.body.weight, true);
		this.setState("body.fat", this.fitbit.body.fat, true);
		this.setState("body.bmi", this.fitbit.body.bmi, true);
	}

	async getFoodRecords() {

		//const url = "https://api.fitbit.com/1/user/-/foods/log/date/2022-02-01.json";
		const url = `${BASE_URL}-/foods/log/date/${this.getDate()}.json`;

		try {
			const response = await axios.get(url,
				{
					headers: { "Authorization": `Bearer ${this.config.token}` },
					timeout: axiosTimeout
				});
			this.log.info(`Food Status: ${response.status}`);

			if (response.status === 200) {
				this.setFoodStates(response.data);
			}
		}
		catch (err) {
			this.log.error(`FITBIT Food Data Error: ${err}`);
		}
	}

	setFoodStates(data) {
		try {
			this.fitbit.food = data.summary;				// First record in the array
			this.log.info(`Food records retrieved Cal:${this.fitbit.food.calories} Water:${this.fitbit.food.water} FAT:${this.fitbit.food.fat} Protein:${this.fitbit.food.protein}`);

			this.setState("food.Water", this.fitbit.food.water, true);
			this.setState("food.Calories", this.fitbit.food.calories, true);
			this.setState("food.Fat", this.fitbit.food.fat, true);
			this.setState("food.Protein", this.fitbit.food.protein, true);
		}
		catch (err) {
			this.log.error(`FITBIT Food Error: ${err}`);
		}
	}

	async getSleepRecords() {
		//const url = "https://api.fitbit.com/1.2/user/-/sleep/date/2022-02-01.json";
		const url = `${BASE2_URL}-/sleep/date/${this.getDate()}.json`;

		try {
			const response = await axios.get(url,
				{
					headers: { "Authorization": `Bearer ${this.config.token}` },
					timeout: axiosTimeout
				});
			this.log.info(`Food Status: ${response.status}`);

			if (response.status === 200) {
				this.setSleepStates(response.data);
			}
		}
		catch (err) {
			this.log.error(`FITBIT Food Data Error: ${err}`);
		}
	}
	setSleepStates(data) {
		this.fitbit.sleep = data.summary.stages;				// First record in the array
		this.log.info(`Sleep records retrieved Deep:${this.fitbit.sleep.deep} light:${this.fitbit.sleep.light} rem:${this.fitbit.sleep.rem} wake:${this.fitbit.sleep.wake}`);

		this.setState("sleep.Deep", this.fitbit.sleep.deep, true);
		this.setState("sleep.Light", this.fitbit.sleep.light, true);
		this.setState("sleep.Rem", this.fitbit.sleep.rem, true);
		this.setState("sleep.Wake", this.fitbit.sleep.wake, true);
	}

	getDate() {
		const today = new Date();
		const dd = today.getDate();
		const mm = today.getMonth() + 1;
		const year = today.getFullYear();

		return `${year}-${mm.toString(10).padStart(2, "0")}-${dd.toString(10).padStart(2, "0")}`;
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	onStateChange(id, state) {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Fitbit(options);
} else {
	// otherwise start the instance directly
	new Fitbit();
}
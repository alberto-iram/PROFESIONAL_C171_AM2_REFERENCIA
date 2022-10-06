var tableNumber = null;

AFRAME.registerComponent("markerhandler", {
  init: async function () {
    
    //Obtener el número de mesa
    if (tableNumber === null) {
      this.askTableNumber();
    }

    //Obtener la colección de platillos
    var dishes = await this.getDishes();

    //Evento makerFound
    this.el.addEventListener("markerFound", () => {
      if (tableNumber !== null) {
        var markerId = this.el.id;
        this.handleMarkerFound(dishes, markerId);
      }
    });
    //Evento markerLost
    this.el.addEventListener("markerLost", () => {
      this.handleMarkerLost();
    });
  },
  askTableNumber: function () {
    var iconUrl = "https://raw.githubusercontent.com/whitehatjr/menu-card-app/main/hunger.png";
    swal({
      title: "¡Bienvenido a Hunger!",
      icon: iconUrl,
      content: {
        element: "input",
        attributes: {
          placeholder: "Escribe el número de tu mesa",
          type: "number",
          min: 1
        }
      },
      closeOnClickOutside: false,
    }).then(inputValue => {
      tableNumber = inputValue;
    });
  },

  handleMarkerFound: function (dishes, markerId) {
    // Obtener el día
    var todaysDate = new Date();
    var todaysDay = todaysDate.getDay();

    // De domingo a sábado: 0 - 6
    var days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ];

    //Obtener el platillo según su ID 
    var dish = dishes.filter(dish => dish.id === markerId)[0];

    //Verificar si el platillo está disponible en hoy
    if (dish.unavailable_days.includes(days[todaysDay])) {
      swal({
        icon: "warning",
        title: dish.dish_name.toUpperCase(),
        text: "¡Este platillo no está disponible hoy!",
        timer: 2500,
        buttons: false
      });
    } else {
      //Cambiar el tamaño del modelo a su escala inicial
      var model = document.querySelector(`#model-${dish.id}`);
      model.setAttribute("position", dish.model_geometry.position);
      model.setAttribute("rotation", dish.model_geometry.rotation);
      model.setAttribute("scale", dish.model_geometry.scale);

      //Actualizar el contenido UI de VISIBILIDAD de la escena AR (MODELO, INGREDIENTES Y PRECIO)      
      model.setAttribute("visible", true);

      var ingredientsContainer = document.querySelector(`#main-plane-${dish.id}`);
      ingredientsContainer.setAttribute("visible", true);

      var priceplane = document.querySelector(`#price-plane-${dish.id}`);
      priceplane.setAttribute("visible", true)

      //Cambiar la visibilidad del botón div
      var buttonDiv = document.getElementById("button-div");
      buttonDiv.style.display = "flex";

      var ratingButton = document.getElementById("rating-button");
      var orderButtton = document.getElementById("order-button");

      if (tableNumber != null) {
        //Usar eventos de clic
        ratingButton.addEventListener("click", function () {
          swal({
            icon: "warning",
            title: "Calificar platillo",
            text: "Procesando calificación"
          });
        });

        orderButtton.addEventListener("click", () => {
          var tNumber;
          tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
          this.handleOrder(tNumber, dish);

          swal({
            icon: "https://i.imgur.com/4NZ6uLY.jpg",
            title: "¡Gracias por tu orden!",
            text: "¡Recibirás tu orden pronto!",
            timer: 2000,
            buttons: false
          });
        });
      }
    }
  },
  handleOrder: function (tNumber, dish) {
    // Leer los detalles de la orden para la mesa actual
    firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .get()
      .then(doc => {
        var details = doc.data();

        if (details["current_orders"][dish.id]) {
          // Increasing Current Quantity
          details["current_orders"][dish.id]["quantity"] += 1;

          //Calculating Subtotal of item
          var currentQuantity = details["current_orders"][dish.id]["quantity"];

          details["current_orders"][dish.id]["subtotal"] =
            currentQuantity * dish.price;
        } else {
          details["current_orders"][dish.id] = {
            item: dish.dish_name,
            price: dish.price,
            quantity: 1,
            subtotal: dish.price * 1
          };
        }

        details.total_bill += dish.price;

        //Actualizar la base de datos
        firebase
          .firestore()
          .collection("tables")
          .doc(doc.id)
          .update(details);
      });
  },
  //Función para obtener la colección de platillos desde la base de datos
  getDishes: async function () {
    return await firebase
      .firestore()
      .collection("dishes")
      .get()
      .then(snap => {
        return snap.docs.map(doc => doc.data());
      });
  },
  handleMarkerLost: function () {
    // Cambiar la visibilidad del botón div
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "none";
  }
});

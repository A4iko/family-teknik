const API_URL = "http://localhost:5000";
//GET CUSTOMERS

async function getcustomers(){
    try {
        const response = await fetch(`${API_URL}/api/customers`);
        if (!response.ok){
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        console.log("Data customers:", data);
        return data;
    } catch (error){
        console.error("gagal mengambil data customers:", error);
    }

}

//tampilkan data customers
async function tampilkancustomers(){
    const customerlist = document.getElementById("customerlist");
    customerlist.innerHTML ="get data...";

    const data = await getcustomers();

    if (!data){
        customerlist.innerHTML = "gagal mengambil data customers";
        return;
    }


customerlist.innerHTML="";

data.forEach(customer => {
    const div = document.createElement("div");
    div.innerHTML =`
    <p>
    id ${customer.id} <br>
    nama : ${customer.name} <br>
    alamat : ${customer.address}<br>
    phone : ${customer.phone} <br>
    </p>
    `;
    customerlist.appendChild(div);
});

}  
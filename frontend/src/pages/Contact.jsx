import React from "react";
import ContactForm from "../components/ContactForm";



function Contact() {
  return (
    <div className="py-5">
      <br/><br/><br/><br/><br/><br/><br/>
      {/*<h2 className="text-center mb-4"></h2>*/}
      <ContactForm darkBackground={false}/>
    </div>
  );
}

export default Contact;

import { Boleto } from 'node-boleto'
import { generatePdf } from 'html-pdf-node'

import Client from 'ssh2-sftp-client'

const configSftp = {
  host: process.env.HOST_SFTP, 
  username: process.env.USERNAME_SFTP, 
  password: process.env.PASSWORD_SFTP,
  port: process.env.PORT_SFTP,
}

export default (request, response) => {
  
  if(request.method == 'POST'){

    const {
      cpf,
      valor, 
      nossoNumero,
      numeroDocumento, 
      cedente,
      cedenteCnpj, 
      agencia,
      codigoCedente, 
      carteira
    } = request.body

    const boleto = new Boleto({
        banco: 'santander',
        data_emissao: new Date(),
        data_vencimento: new Date(new Date().getTime() + 5 * 24 * 3600 * 1000), // 5 dias futuramente
        valor: Number(valor), // R$ 15,00 (valor em centavos)
        nosso_numero: nossoNumero,
        numero_documento: numeroDocumento,
        cedente,
        cedente_cnpj: cedenteCnpj, // sem pontos e traços 
        agencia,
        codigo_cedente: codigoCedente, // PSK (código da carteira)
        carteira,
    })
  
    try{     
      boleto.renderHTML(function (html) {
        
        const config = { format: 'A4' }
        generatePdf({ 'content': html }, config)
        .then(pdf => {
          const sftp = new Client()
  
          const nomeArq = `boleto-${cpf}.pdf`
  
          sftp.connect(configSftp)
          .then(() => {
              return sftp.put(pdf, process.env.DIRECTORY + nomeArq)
          })
          .then(() => {
              sftp.end()
          })
        })
            
          return response.json()
      })
    }catch(err){
        console.log(err);
        response.status(400).json({ erro: 'Ocorreu um erro'})
    }
  }

  else if(request.method == 'DELETE'){

    const { cpf } = request.query
    const caminhoArq = `${process.env.DIRECTORY}boleto-${cpf}.pdf`

    const sftp = new Client();

    sftp.connect(configSftp)
    .then(() => {
        return sftp.delete(caminhoArq);
    })
    .then(() => {
        return sftp.end();
    })

    return response.status(204).json()
  }else{
    return response.status(400).json()
  }

}
